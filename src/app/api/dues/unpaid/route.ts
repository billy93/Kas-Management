import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Get first organization (demo purposes)
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all active members
    const members = await prisma.member.findMany({
      where: {
        organizationId: org.id,
        isActive: true
      },
      include: {
        dues: {
          where: {
            month,
            year
          },
          include: {
            payments: true
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // Calculate unpaid members
    const unpaidMembers = [];
    const defaultDuesAmount = 50000; // Default dues amount

    for (const member of members) {
      let duesAmount = defaultDuesAmount;
      let totalPaid = 0;
      let status: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING';

      // Check if dues exist for this month/year
      const dues = member.dues.find(d => d.month === month && d.year === year);
      
      if (dues) {
        duesAmount = dues.amount;
        totalPaid = dues.payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        if (totalPaid >= duesAmount) {
          status = 'PAID';
        } else if (totalPaid > 0) {
          status = 'PARTIAL';
        } else {
          status = 'PENDING';
        }
      }

      // Only include members who haven't fully paid
      if (status !== 'PAID') {
        // Create dues record if it doesn't exist
        let duesId = dues?.id;
        if (!dues) {
          const newDues = await prisma.dues.create({
            data: {
              organizationId: org.id,
              memberId: member.id,
              month,
              year,
              amount: duesAmount,
              status: 'PENDING'
            }
          });
          duesId = newDues.id;
        }

        unpaidMembers.push({
          member: {
            id: member.id,
            fullName: member.fullName,
            email: member.email,
            phone: member.phone
          },
          duesAmount,
          totalPaid,
          remainingAmount: duesAmount - totalPaid,
          status,
          duesId
        });
      }
    }

    return NextResponse.json(unpaidMembers);
  } catch (error) {
    console.error('Error fetching unpaid members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}