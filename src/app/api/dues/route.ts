import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId")!;
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const where: any = { organizationId };
  if (month) where.month = month;
  if (year) where.year = year;
  const dues = await prisma.dues.findMany({ where, include: { member: true, payments: true } });
  return NextResponse.json(dues);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { month, year, amount, memberId, organizationId } = await req.json();
    
    console.log('POST /api/dues received:', { month, year, amount, memberId, organizationId });
    
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }
    
    // Verify user has access to this organization
    const membership = await prisma.membership.findFirst({
      where: { 
        user: { email: session.user.email },
        organizationId: organizationId
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied to organization" }, { status: 403 });
    }
    
    if (!month || !year || !amount) {
      return NextResponse.json({ error: "month, year, amount required" }, { status: 400 });
    }
    
    // If memberId is provided, create dues for specific member
    if (memberId) {
      const dues = await prisma.dues.upsert({
        where: { memberId_month_year: { memberId, month, year } },
        update: { amount },
        create: { organizationId, memberId, month, year, amount }
      });
      return NextResponse.json(dues);
    }
    
    // Otherwise, create dues for all active members (existing behavior)
    const members = await prisma.member.findMany({ where: { isActive: true, organizationId } });
    const ops = members.map(m => prisma.dues.upsert({
      where: { memberId_month_year: { memberId: m.id, month, year } },
      update: { amount },
      create: { organizationId, memberId: m.id, month, year, amount }
    }));
    const results = await prisma.$transaction(ops);
    return NextResponse.json({ createdOrUpdated: results.length });
  } catch (error) {
    console.error("Error creating dues:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
