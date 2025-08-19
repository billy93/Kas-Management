import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UserMemberLinkSchema = z.object({
  userId: z.string(),
  memberId: z.string(),
  organizationId: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId },
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    const links = await prisma.userMemberLink.findMany({
      where: {
        organizationId,
      },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching user-member links:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UserMemberLinkSchema.parse(body);
    const { userId, memberId, organizationId } = validatedData;

    // Verify user has access to this organization
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId },
        }
      }
    });

    if (!currentUser || currentUser.memberships.length === 0) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Check if user exists and has membership in the organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            organizationId,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or not a member of this organization' },
        { status: 404 }
      );
    }

    // Check if member exists in the organization
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found in this organization' },
        { status: 404 }
      );
    }

    // Check if link already exists
    const existingLink = await prisma.userMemberLink.findFirst({
      where: {
        OR: [
          { userId, memberId },
          { userId, organizationId },
        ],
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'User is already linked to a member in this organization' },
        { status: 409 }
      );
    }

    // Create the link
    const link = await prisma.userMemberLink.create({
      data: {
        userId,
        memberId,
        organizationId,
      },
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
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating user-member link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}