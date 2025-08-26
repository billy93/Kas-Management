import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const MemberSchema = z.object({
  organizationId: z.string(),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
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

    const members = await prisma.member.findMany({ 
      where: { organizationId },
      include: {
        userLinks: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { fullName: 'asc' }
    });
    
    // Get organization info for each member from their own organizationId
    const membersWithOrganizations = await Promise.all(
      members.map(async (member: any) => {
        // Get organization info from member's organizationId
        const organization = await prisma.organization.findUnique({
          where: { id: member.organizationId },
          select: {
            id: true,
            name: true
          }
        });
        
        return {
          ...member,
          organizations: organization ? [{
            id: organization.id,
            name: organization.name,
            role: 'MEMBER' // Member role in their organization
          }] : []
        };
      })
    );
    return NextResponse.json(membersWithOrganizations);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = MemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const member = await prisma.member.create({ data: parsed.data });
  return NextResponse.json(member, { status: 201 });
}
