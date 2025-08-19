import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const { memberId } = params;

    // Get all dues for this member that are not fully paid, ordered by year and month
    const outstandingDues = await prisma.dues.findMany({
      where: {
        memberId: memberId,
        OR: [
          { status: 'PENDING' },
          { status: 'PARTIAL' }
        ]
      },
      include: {
        payments: true
      },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' }
      ]
    });

    // Calculate remaining amount for each dues
    const duesWithRemaining = outstandingDues.map(dues => {
      const totalPaid = dues.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingAmount = dues.amount - totalPaid;
      
      return {
        id: dues.id,
        year: dues.year,
        month: dues.month,
        amount: dues.amount,
        totalPaid,
        remainingAmount,
        status: dues.status
      };
    }).filter(dues => dues.remainingAmount > 0);

    return NextResponse.json(duesWithRemaining);
  } catch (error) {
    console.error('Error fetching outstanding dues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outstanding dues' },
      { status: 500 }
    );
  }
}