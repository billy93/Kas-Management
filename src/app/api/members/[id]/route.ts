import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const memberId = params.id;
    
    // Check if member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Delete related records first (due to foreign key constraints)
    await prisma.payment.deleteMany({
      where: { memberId }
    });
    
    await prisma.dues.deleteMany({
      where: { memberId }
    });
    
    // Delete the member
    await prisma.member.delete({
      where: { id: memberId }
    });
    
    return NextResponse.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const memberId = params.id;
    
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        dues: {
          include: {
            payments: true
          }
        }
      }
    });
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    return NextResponse.json(member);
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = params.id;
    const body = await request.json();
    const { fullName, email, phone, address, isActive } = body;
    
    // Validate required fields
    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    // Check if member exists
    const existingMember = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        organization: true
      }
    });

    if (!existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if user has access to this member's organization
    const userMemberships = await prisma.membership.findMany({
      where: {
        userId: session.user.id
      }
    });

    const userOrgIds = userMemberships.map(m => m.organizationId);
    const memberOrgId = existingMember.organizationId;
    
    const hasAccess = userOrgIds.includes(memberOrgId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        fullName: fullName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        isActive
      }
    });
    
    return NextResponse.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}