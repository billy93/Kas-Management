import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const memberId = params.id;
    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organizationId');
    
    // Get all dues for this member, optionally filtered by organization
    const whereClause: any = { memberId };
    
    if (organizationId) {
      // Get member's organization to filter dues
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { organizationId: true }
      });
      
      if (member && member.organizationId === organizationId) {
        whereClause.member = {
          organizationId
        };
      } else {
        return NextResponse.json([]);
      }
    }
    
    // Get all dues for this member
    const dues = await prisma.dues.findMany({
      where: whereClause,
      include: {
        payments: true,
        member: {
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });
    
    // Transform dues to payment history format
    const paymentHistory = dues.map(due => {
      const paidAmount = due.payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      return {
        month: due.month,
        year: due.year,
        status: due.status,
        amount: due.amount,
        paidAmount,
        organizationId: due.member.organizationId,
        organizationName: due.member.organization.name
      };
    });
    
    return NextResponse.json(paymentHistory);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}