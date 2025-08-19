import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES, getRequestInfo } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Verify user has ADMIN access to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { 
            organizationId,
            role: 'ADMIN' // Only ADMIN can create backups
          },
          include: { organization: true }
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const org = user.memberships[0].organization;

    // Get all organization data
    const [organization, members, duesConfigs, dues, payments, transactions, memberships] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.member.findMany({ where: { organizationId } }),
      prisma.duesConfig.findMany({ where: { organizationId } }),
      prisma.dues.findMany({ 
        where: { organizationId },
        include: { payments: true }
      }),
      prisma.payment.findMany({ 
        where: { dues: { organizationId } },
        include: { dues: true }
      }),
      prisma.transaction.findMany({ where: { organizationId } }),
      prisma.membership.findMany({ 
        where: { organizationId },
        include: { user: { select: { email: true, name: true } } }
      })
    ]);

    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      organizationId,
      data: {
        organization,
        members,
        duesConfigs,
        dues,
        payments,
        transactions,
        memberships
      },
      metadata: {
        memberCount: members.length,
        duesCount: dues.length,
        paymentCount: payments.length,
        transactionCount: transactions.length
      }
    };

    // Create audit log
    const requestInfo = getRequestInfo(req);
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'Backup',
      details: { 
        memberCount: members.length,
        duesCount: dues.length,
        paymentCount: payments.length,
        transactionCount: transactions.length
      },
      ...requestInfo
    });

    const filename = `backup_${org.name}_${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, backupData, mode = 'merge' } = await req.json();

    if (!organizationId || !backupData) {
      return NextResponse.json({ error: "Organization ID and backup data are required" }, { status: 400 });
    }

    // Verify user has ADMIN access to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { 
            organizationId,
            role: 'ADMIN' // Only ADMIN can restore backups
          }
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Validate backup data structure
    if (!backupData.data || !backupData.version) {
      return NextResponse.json({ error: "Invalid backup data format" }, { status: 400 });
    }

    const { data } = backupData;
    let restoredCounts = {
      members: 0,
      dues: 0,
      payments: 0,
      transactions: 0
    };

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx:any) => {
      // If mode is 'replace', clear existing data first
      if (mode === 'replace') {
        await tx.payment.deleteMany({ where: { dues: { organizationId } } });
        await tx.dues.deleteMany({ where: { organizationId } });
        await tx.transaction.deleteMany({ where: { organizationId } });
        await tx.member.deleteMany({ where: { organizationId } });
        await tx.duesConfig.deleteMany({ where: { organizationId } });
      }

      // Restore members
      if (data.members) {
        for (const member of data.members) {
          const { id, ...memberData } = member;
          await tx.member.upsert({
            where: { id },
            update: memberData,
            create: { id, ...memberData }
          });
          restoredCounts.members++;
        }
      }

      // Restore dues configs
      if (data.duesConfigs) {
        for (const config of data.duesConfigs) {
          const { id, ...configData } = config;
          await tx.duesConfig.upsert({
            where: { id },
            update: configData,
            create: { id, ...configData }
          });
        }
      }

      // Restore dues
      if (data.dues) {
        for (const due of data.dues) {
          const { id, payments, ...dueData } = due;
          await tx.dues.upsert({
            where: { id },
            update: dueData,
            create: { id, ...dueData }
          });
          restoredCounts.dues++;
        }
      }

      // Restore payments
      if (data.payments) {
        for (const payment of data.payments) {
          const { id, dues, ...paymentData } = payment;
          await tx.payment.upsert({
            where: { id },
            update: paymentData,
            create: { id, ...paymentData }
          });
          restoredCounts.payments++;
        }
      }

      // Restore transactions
      if (data.transactions) {
        for (const transaction of data.transactions) {
          const { id, ...transactionData } = transaction;
          await tx.transaction.upsert({
            where: { id },
            update: transactionData,
            create: { id, ...transactionData }
          });
          restoredCounts.transactions++;
        }
      }
    });

    // Create audit log
    const requestInfo = getRequestInfo(req);
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'Restore',
      details: { 
        mode,
        restoredCounts,
        backupVersion: backupData.version,
        backupCreatedAt: backupData.createdAt
      },
      ...requestInfo
    });

    return NextResponse.json({ 
      message: 'Backup restored successfully',
      restoredCounts
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}