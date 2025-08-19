import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES, getRequestInfo } from "@/lib/audit";

function convertToCSV(data: any[], headers: string[]) {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type'); // 'payments', 'transactions', 'members', 'dues'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!organizationId || !type) {
      return NextResponse.json({ error: "Organization ID and type are required" }, { status: 400 });
    }

    // Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId },
          include: { organization: true }
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 });
    }

    const org = user.memberships[0].organization;
    let data: any[] = [];
    let headers: string[] = [];
    let filename = '';

    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } : {};

    switch (type) {
      case 'payments':
        data = await prisma.payment.findMany({
          where: {
            dues: { organizationId },
            ...dateFilter
          },
          include: {
            member: true,
            dues: true,
            createdBy: true
          },
          orderBy: { paidAt: 'desc' }
        });
        headers = ['id', 'memberName', 'amount', 'method', 'paidAt', 'month', 'year', 'note', 'createdBy'];
        data = data.map(p => ({
          id: p.id,
          memberName: p.member.fullName,
          amount: p.amount,
          method: p.method || '',
          paidAt: p.paidAt.toISOString(),
          month: p.dues.month,
          year: p.dues.year,
          note: p.note || '',
          createdBy: p.createdBy?.name || ''
        }));
        filename = `payments_${org.name}_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'transactions':
        data = await prisma.transaction.findMany({
          where: {
            organizationId,
            ...dateFilter
          },
          include: {
            createdBy: true
          },
          orderBy: { occurredAt: 'desc' }
        });
        headers = ['id', 'type', 'amount', 'category', 'occurredAt', 'note', 'createdBy'];
        data = data.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          category: t.category || '',
          occurredAt: t.occurredAt.toISOString(),
          note: t.note || '',
          createdBy: t.createdBy?.name || ''
        }));
        filename = `transactions_${org.name}_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'members':
        data = await prisma.member.findMany({
          where: { organizationId },
          orderBy: { fullName: 'asc' }
        });
        headers = ['id', 'fullName', 'email', 'phone', 'joinedAt', 'isActive', 'notes'];
        data = data.map(m => ({
          id: m.id,
          fullName: m.fullName,
          email: m.email || '',
          phone: m.phone || '',
          joinedAt: m.joinedAt.toISOString(),
          isActive: m.isActive,
          notes: m.notes || ''
        }));
        filename = `members_${org.name}_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'dues':
        data = await prisma.dues.findMany({
          where: {
            organizationId,
            ...dateFilter
          },
          include: {
            member: true,
            payments: true
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        headers = ['id', 'memberName', 'month', 'year', 'amount', 'status', 'totalPaid', 'remaining'];
        data = data.map(d => {
          const totalPaid = d.payments.reduce((sum, p) => sum + p.amount, 0);
          return {
            id: d.id,
            memberName: d.member.fullName,
            month: d.month,
            year: d.year,
            amount: d.amount,
            status: d.status,
            totalPaid,
            remaining: d.amount - totalPaid
          };
        });
        filename = `dues_${org.name}_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    const csv = convertToCSV(data, headers);
    
    // Create audit log
    const requestInfo = getRequestInfo(req);
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'Export',
      details: { type, recordCount: data.length },
      ...requestInfo
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}