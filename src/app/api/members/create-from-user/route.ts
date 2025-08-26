import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const CreateMemberFromUserSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateMemberFromUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, organizationId, fullName, phone, notes } = parsed.data;

    // Verify current user has access to this organization
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId },
        }
      }
    });

    if (!currentUser || currentUser.memberships.length === 0) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has a member in this organization
    const existingLink = await prisma.userMemberLink.findFirst({
      where: {
        userId,
        organizationId,
      },
    });

    if (existingLink) {
      return NextResponse.json({ error: "User already has a member in this organization" }, { status: 400 });
    }

    // Create member
    const member = await prisma.member.create({
      data: {
        organizationId,
        fullName,
        email: targetUser.email,
        phone,
        notes,
      },
    });

    // Create UserMemberLink
    await prisma.userMemberLink.create({
      data: {
        userId,
        memberId: member.id,
        organizationId,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error creating member from user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}