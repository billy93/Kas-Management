import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

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

    // Find the link first to get organization info
    const link = await prisma.userMemberLink.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'User-member link not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId: link.organizationId },
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Delete the link
    await prisma.userMemberLink.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'User-member link deleted successfully' });
  } catch (error) {
    console.error('Error deleting user-member link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const link = await prisma.userMemberLink.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            joinedAt: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'User-member link not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId: link.organizationId },
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error('Error fetching user-member link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}