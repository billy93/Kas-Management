import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, email, phoneNumber } = body;

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.id !== id) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Find the user to update
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        memberships: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the current user has permission to update this user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Check if both users share at least one organization
    const currentUserOrgIds = currentUser.memberships.map(m => m.organizationId);
    const targetUserOrgIds = user.memberships.map(m => m.organizationId);
    const hasSharedOrg = currentUserOrgIds.some(orgId => targetUserOrgIds.includes(orgId));

    if (!hasSharedOrg && currentUser.id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phoneNumber: phoneNumber || null
      },
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Find the user first to verify it exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        memberships: true,
        transactions: true,
        payments: true,
        memberLinks: true,
        accounts: true,
        sessions: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the current user has permission to delete this user
    // For now, we'll allow users to delete other users if they're in the same organization
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Check if both users share at least one organization
    const currentUserOrgIds = currentUser.memberships.map(m => m.organizationId);
    const targetUserOrgIds = user.memberships.map(m => m.organizationId);
    const hasSharedOrg = currentUserOrgIds.some(orgId => targetUserOrgIds.includes(orgId));

    if (!hasSharedOrg && currentUser.id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete related records in the correct order to avoid foreign key constraints
    console.log(`Deleting user ${user.email} and related data...`);

    // Delete NextAuth sessions and accounts
    await prisma.session.deleteMany({
      where: { userId: id }
    });

    await prisma.account.deleteMany({
      where: { userId: id }
    });

    // Delete user-member links
    await prisma.userMemberLink.deleteMany({
      where: { userId: id }
    });

    // Delete payments made by this user
    await prisma.payment.deleteMany({
      where: { createdById: id }
    });

    // Delete transactions created by this user
    await prisma.transaction.deleteMany({
      where: { createdById: id }
    });

    // Delete memberships
    await prisma.membership.deleteMany({
      where: { userId: id }
    });

    // Finally, delete the user
    await prisma.user.delete({
      where: { id }
    });

    console.log(`Successfully deleted user ${user.email}`);
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}