import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const memberId = params.id;
    
    // Get the last 12 months
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    const monthsToCheck = [];
    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      monthsToCheck.push({ month, year });
    }
    
    // Get dues configuration
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    const duesConfig = await prisma.duesConfig.findFirst({
      where: { organizationId: org.id }
    });
    
    const defaultAmount = duesConfig?.amount || 50000;
    
    // Get all dues and payments for this member in the last 12 months
    const paymentHistory = [];
    
    for (const { month, year } of monthsToCheck) {
      // Check if dues exist for this month/year
      const dues = await prisma.dues.findFirst({
        where: {
          memberId,
          month,
          year
        },
        include: {
          payments: true
        }
      });
      
      let status: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING';
      let amount = defaultAmount;
      let paidAmount = 0;
      
      if (dues) {
        amount = dues.amount;
        status = dues.status;
        paidAmount = dues.payments.reduce((sum, payment) => sum + payment.amount, 0);
      }
      
      paymentHistory.push({
        month,
        year,
        status,
        amount,
        paidAmount
      });
    }
    
    // Sort by year and month (newest first)
    paymentHistory.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    return NextResponse.json(paymentHistory);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}