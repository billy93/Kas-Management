import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, organizationId } = body;

    // Validate required fields
    if (!memberId || !organizationId) {
      return NextResponse.json({ error: 'Member ID and Organization ID are required' }, { status: 400 });
    }

    // Check if member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if user has access to this organization
    const userMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: organizationId,
        status: 'ACTIVE'
      }
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Check if member is already assigned to this organization
    const existingMembership = await prisma.memberOrganization.findFirst({
      where: {
        memberId: memberId,
        organizationId: organizationId
      }
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'Member is already assigned to this organization' }, { status: 400 });
    }

    // Create the membership
    const membership = await prisma.memberOrganization.create({
      data: {
        memberId: memberId,
        organizationId: organizationId,
        status: 'ACTIVE',
        joinedAt: new Date()
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Member successfully assigned to organization',
      membership
    });
  } catch (error) {
    console.error('Error assigning member to organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}