import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const year = searchParams.get("year");
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Build where clause with filters
    const whereClause: any = {
      organizationId: organizationId,
    };

    // Add year filter
    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      whereClause.occurredAt = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    // Add category filter (case-insensitive partial match)
    if (category) {
      whereClause.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    // Add type filter
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      whereClause.type = type;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        occurredAt: "desc",
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session as any).uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, type, amount, category, occurredAt, note, createdById } = await req.json();
    if (!organizationId || !type || !amount) {
      return NextResponse.json({ error: "organizationId, type, amount required" }, { status: 400 });
    }

    // Verify user has access to the organization
    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        user: {
          email: session.user.email
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const created = await prisma.transaction.create({
      data: { 
        organizationId, 
        type, 
        amount, 
        category, 
        occurredAt: occurredAt ? new Date(occurredAt) : undefined, 
        note, 
        createdById: createdById || (session as any).uid
      },
      include: {
        createdBy: {
          select: {
            name: true
          }
        }
      }
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
