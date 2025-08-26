import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireRole } from "@/lib/rbac";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  organizationId: z.string(),
  role: z.enum(["ADMIN", "TREASURER", "VIEWER"]).default("VIEWER")
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, name, organizationId, role } = parsed.data;

    // Check if user has admin access to the organization
    await requireRole(session.user.email, organizationId, ["ADMIN"]);

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { organizationId }
        }
      }
    });

    // If user exists and already has membership in this organization
    if (user && user.memberships.length > 0) {
      return NextResponse.json({ 
        error: "User sudah menjadi member di organisasi ini" 
      }, { status: 400 });
    }

    // Create user if doesn't exist - with emailVerified set to current date (auto-verified)
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          emailVerified: new Date() // Auto-verified for direct creation
        }
      });
    } else {
      // If user exists but not verified, verify them
      if (!user.emailVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: new Date(),
            name: name || user.name
          }
        });
      }
    }

    // Create membership
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId,
        role
      }
    });

    return NextResponse.json({
      success: true,
      message: "User berhasil dibuat dan ditambahkan ke organisasi",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      },
      membership: {
        id: membership.id,
        role: membership.role,
        organizationId: membership.organizationId
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}