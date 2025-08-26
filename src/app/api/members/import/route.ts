import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const ImportMemberSchema = z.object({
  organizationId: z.string(),
  members: z.array(z.object({
    fullName: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  }))
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ImportMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { organizationId, members } = parsed.data;

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

    // Check if user has admin or treasurer role
    const membership = currentUser.memberships[0];
    if (membership.role !== 'ADMIN' && membership.role !== 'TREASURER') {
      return NextResponse.json({ error: "Insufficient permissions. Only Admin or Treasurer can import members." }, { status: 403 });
    }

    const results = {
      success: [],
      errors: [],
      duplicates: []
    };

    // Process each member
    for (let i = 0; i < members.length; i++) {
      const memberData = members[i];
      
      try {
        // Check for duplicate by email or name in the same organization
        let existingMember = null;
        
        if (memberData.email) {
          existingMember = await prisma.member.findFirst({
            where: {
              organizationId,
              email: memberData.email
            }
          });
        }
        
        if (!existingMember) {
          existingMember = await prisma.member.findFirst({
            where: {
              organizationId,
              fullName: memberData.fullName
            }
          });
        }

        if (existingMember) {
          results.duplicates.push({
            row: i + 1,
            member: memberData,
            reason: `Member with ${memberData.email ? 'email' : 'name'} already exists`
          });
          continue;
        }

        // Create member
        const newMember = await prisma.member.create({
          data: {
            organizationId,
            fullName: memberData.fullName,
            email: memberData.email || null,
            phone: memberData.phone || null,
            notes: memberData.notes || null,
          }
        });

        results.success.push({
          row: i + 1,
          member: newMember
        });

      } catch (error) {
        results.errors.push({
          row: i + 1,
          member: memberData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.success.length} members created, ${results.duplicates.length} duplicates skipped, ${results.errors.length} errors.`,
      results
    }, { status: 201 });

  } catch (error) {
    console.error('Error importing members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}