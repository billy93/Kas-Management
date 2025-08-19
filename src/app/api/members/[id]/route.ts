import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const memberId = params.id;
    const body = await request.json();
    const { fullName, email, phone, isActive } = body;
    
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        fullName,
        email,
        phone,
        isActive
      }
    });
    
    return NextResponse.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}