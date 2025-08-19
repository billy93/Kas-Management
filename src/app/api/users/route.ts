import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  image: z.string().optional(),
});

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

    // Get all users who are members of this organization
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          where: { organizationId },
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            transactions: true,
            payments: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter users who have memberships in the selected organization
    const filteredUsers = users.filter(user => user.memberships.length > 0);

    // Format the response
    const usersWithDetails = filteredUsers.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberships: user.memberships.map(membership => ({
        id: membership.id,
        role: membership.role,
        organization: membership.organization,
        createdAt: membership.createdAt
      })),
      transactionCount: user._count.transactions,
      paymentCount: user._count.payments
    }));

    return NextResponse.json(usersWithDetails);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const user = await prisma.user.create({ 
      data: parsed.data,
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });
    
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}