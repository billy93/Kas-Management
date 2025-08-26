import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const organizationIdParam = searchParams.get('organizationId');

    let organizationId: string;

    if (organizationIdParam) {
      // Verify user has access to this organization
      const membership = await prisma.membership.findFirst({
        where: { 
          user: { email: session.user.email },
          organizationId: organizationIdParam
        }
      });

      if (!membership) {
        return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
      }

      organizationId = organizationIdParam;
    } else {
      // Fallback to user's first organization
      const membership = await prisma.membership.findFirst({
        where: { 
          user: { email: session.user.email }
        },
        include: { organization: true }
      });

      if (!membership?.organizationId) {
        return NextResponse.json({ error: 'No organization found' }, { status: 400 });
      }

      organizationId = membership.organizationId;
    }

    // Get all members in the organization
    const members = await prisma.member.findMany({
      where: {
        organizationId: organizationId,
        isActive: true
      },
      orderBy: { fullName: 'asc' }
    });

    // Get all dues for the year
    const dues = await prisma.dues.findMany({
      where: {
        organizationId: organizationId,
        year: year
      },
      include: {
        payments: true,
        member: true
      }
    });

    // Process data to create yearly status for each member
    const yearlyStatuses = members.map(member => {
      const memberDues = dues.filter(d => d.memberId === member.id);
      const monthlyStatus: { [month: number]: any } = {};

      // Initialize all months
      for (let month = 1; month <= 12; month++) {
        const monthDues = memberDues.find(d => d.month === month);
        
        if (monthDues) {
          const totalPaid = monthDues.payments.reduce((sum, payment) => sum + payment.amount, 0);
          const remainingAmount = monthDues.amount - totalPaid;
          
          let status: 'PAID' | 'PARTIAL' | 'PENDING';
          if (remainingAmount <= 0) {
            status = 'PAID';
          } else if (totalPaid > 0) {
            status = 'PARTIAL';
          } else {
            status = 'PENDING';
          }

          monthlyStatus[month] = {
            status,
            duesAmount: monthDues.amount,
            totalPaid,
            remainingAmount: Math.max(0, remainingAmount),
            duesId: monthDues.id
          };
        }
      }

      return {
        memberId: member.id,
        member: {
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone
        },
        year,
        monthlyStatus
      };
    });

    return NextResponse.json(yearlyStatuses);
  } catch (error) {
    console.error('Error fetching yearly dues status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}