import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizationId from query parameters
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
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
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 });
    }

    // Get users who don't have a member in this organization yet
    const usersWithoutMember = await prisma.user.findMany({
      where: {
        memberLinks: {
          none: {
            organizationId
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(usersWithoutMember);
  } catch (error) {
    console.error('Error fetching available users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}