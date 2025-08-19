import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with their memberships and organizations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract organizations from memberships
    const organizations = user.memberships.map(membership => ({
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role
    }));

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}