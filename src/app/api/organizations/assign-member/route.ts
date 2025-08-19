import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId, organizationId, role } = await req.json();

    if (!memberId || !organizationId || !role) {
      return NextResponse.json({ error: 'Member ID, Organization ID, and role are required' }, { status: 400 });
    }

    // Get the member to find their email
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { email: true, fullName: true }
    });

    if (!member || !member.email) {
      return NextResponse.json({ error: 'Member not found or has no email' }, { status: 404 });
    }

    // Find or create user with the member's email
    let user = await prisma.user.findUnique({
      where: { email: member.email }
    });

    if (!user) {
      // Create user if doesn't exist
      user = await prisma.user.create({
        data: {
          email: member.email,
          name: member.fullName,
          emailVerified: new Date()
        }
      });
    }

    // Check if user already has membership in this organization
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organizationId
        }
      }
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'User already has membership in this organization' }, { status: 400 });
    }

    // Create membership
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: organizationId,
        role: role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
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

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    console.error('Error assigning member to organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}