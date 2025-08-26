import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizationId from query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
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

    // Get transactions with more details
    const transactions = await prisma.transaction.findMany({ 
      where: { organizationId: org.id },
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        category: true,
        occurredAt: true,
        note: true
      }
    });
    
    const transactionIncome = transactions.filter((t: any) => t.type === "INCOME").reduce((a: number, t: any) => a + t.amount, 0);
    const expense = transactions.filter((t: any) => t.type === "EXPENSE").reduce((a: number, t: any) => a + t.amount, 0);
    
    // Get payments (dues income) for current year - filtered by organization
    const currentYear = new Date().getFullYear();
    const payments = await prisma.payment.findMany({
      where: {
        paidAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`)
        },
        dues: {
          organizationId: org.id
        }
      }
    });
    const paymentsIncome = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
    
    // Total income = transaction income + payments income
    const income = transactionIncome + paymentsIncome;
    const balance = income - expense;

    // Calculate unpaid dues
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Get dues configuration for this organization
    const duesConfig = await prisma.duesConfig.findFirst({
      where: { organizationId: org.id }
    });
    const defaultDuesAmount = duesConfig?.amount || 50000;

    // Generate last 12 months
    const last12Months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      last12Months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });
    }

    // Calculate total unpaid amount - get all unpaid/partial dues from organization
    const unpaidDues = await prisma.dues.findMany({
      where: {
        organizationId: org.id,
        status: {
          in: ['PENDING', 'PARTIAL']
        }
      },
      include: {
        payments: true
      }
    });

    // Calculate total unpaid amount
    const totalUnpaidAmount = unpaidDues.reduce((total: number, dues: any) => {
      const totalPaid = dues.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const remainingAmount = dues.amount - totalPaid;
      return total + (remainingAmount > 0 ? remainingAmount : 0);
    }, 0);

    // Get all members with their dues for monthly arrears calculation
    const members = await prisma.member.findMany({
      where: { organizationId: org.id, isActive: true },
      include: {
        dues: {
          where: {
            OR: last12Months.map(m => ({ month: m.month, year: m.year }))
          },
          include: { payments: true }
        }
      }
    });

    // Calculate monthly arrears data
    const monthlyArrears = last12Months.map(monthData => {
      const monthUnpaid = members.reduce((total, member) => {
        const dues = member.dues.find(d => d.month === monthData.month && d.year === monthData.year);
        if (!dues) return total + defaultDuesAmount; // No dues record = unpaid
        
        const totalPaid = dues.payments.reduce((sum, payment) => sum + payment.amount, 0);
        return totalPaid < dues.amount ? total + (dues.amount - totalPaid) : total;
      }, 0);
      
      return {
        month: monthData.month,
        year: monthData.year,
        unpaidAmount: monthUnpaid
      };
    }).reverse(); // Reverse to get chronological order

    // Get user's personal unpaid dues
    const userMemberLink = await prisma.userMemberLink.findFirst({
      where: {
        userId: user.id,
        organizationId: org.id
      },
      include: {
        member: {
          include: {
            dues: {
              where: {
                status: {
                  in: ['PENDING', 'PARTIAL']
                }
              },
              include: {
                payments: true
              }
            }
          }
        }
      }
    });

    let personalUnpaidAmount = 0;
    let personalUnpaidMonths = 0;
    
    if (userMemberLink?.member) {
      userMemberLink.member.dues.forEach(dues => {
        const totalPaid = dues.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const remainingAmount = dues.amount - totalPaid;
        if (remainingAmount > 0) {
          personalUnpaidAmount += remainingAmount;
          personalUnpaidMonths += 1;
        }
      });
    }

    return NextResponse.json({
      income,
      expense,
      balance,
      totalUnpaidAmount,
      personalUnpaidAmount,
      personalUnpaidMonths,
      monthlyTransactions: transactions,
      monthlyArrears,
      categoryBreakdown: [],
      monthlyTrend: []
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}