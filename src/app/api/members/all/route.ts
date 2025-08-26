import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organizations to determine access
    const userMemberships = await prisma.organizationMember.findMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      },
      include: {
        organization: true
      }
    });

    if (userMemberships.length === 0) {
      return NextResponse.json({ error: 'No organization access' }, { status: 403 });
    }

    const organizationIds = userMemberships.map(m => m.organizationId);

    // Get all members from user's accessible organizations
    const members = await prisma.member.findMany({
      where: {
        memberships: {
          some: {
            organizationId: {
              in: organizationIds
            }
          }
        }
      },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          },
          where: {
            organizationId: {
              in: organizationIds
            }
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // Transform the data to include organizations array
    const transformedMembers = members.map(member => ({
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      address: member.address,
      isActive: member.isActive,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      organizations: member.memberships.map(membership => ({
        id: membership.organization.id,
        name: membership.organization.name,
        membershipStatus: membership.status
      }))
    }));

    return NextResponse.json(transformedMembers);
  } catch (error) {
    console.error('Error fetching all members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}