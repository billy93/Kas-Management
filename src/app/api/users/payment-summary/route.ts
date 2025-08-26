import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId');

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Verify user has access to this organization
    const userMembership = await prisma.membership.findFirst({
      where: {
        user: {
          email: session.user.email
        },
        organizationId: organizationId
      },
      include: {
        organization: true
      }
    });

    if (!userMembership) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 });
    }

    // Find the member linked to this user in this organization
    const userMemberLink = await prisma.userMemberLink.findFirst({
      where: {
        userId: userId,
        organizationId: organizationId
      },
      include: {
        member: true
      }
    });

    if (!userMemberLink) {
      // If no member is linked to this user, return empty data
      return NextResponse.json({
        paidAmount: 0,
        unpaidAmount: 0,
        totalDues: 0,
        paidDues: 0,
        unpaidDues: 0
      });
    }

    // Get all dues for this specific member
    const allDues = await prisma.dues.findMany({
      where: {
        memberId: userMemberLink.memberId,
        organizationId: organizationId
      },
      include: {
        payments: true
      }
    });

    let paidAmount = 0;
    let unpaidAmount = 0;
    let paidDues = 0;
    let unpaidDues = 0;

    allDues.forEach((due: any) => {
      const totalPaid = due.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const remaining = due.amount - totalPaid;

      if (remaining <= 0) {
        // Fully paid
        paidAmount += due.amount;
        paidDues += 1;
      } else {
        // Partially paid or unpaid
        paidAmount += totalPaid;
        unpaidAmount += remaining;
        unpaidDues += 1;
      }
    });

    return NextResponse.json({
      paidAmount,
      unpaidAmount,
      totalDues: allDues.length,
      paidDues,
      unpaidDues
    });

  } catch (error) {
    console.error('Error fetching payment summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}