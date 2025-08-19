import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";

const VerifySchema = z.object({
  token: z.string()
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Decode the token
    let tokenData;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      tokenData = JSON.parse(decoded);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const { userId, organizationId, timestamp } = tokenData;

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (tokenAge > maxAge) {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }

    // Verify user and organization exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { organizationId },
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const membership = user.memberships[0];
    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    // Create member record automatically
    const existingMember = await prisma.member.findFirst({
      where: {
        email: user.email,
        organizationId
      }
    });

    let member;
    if (!existingMember) {
      member = await prisma.member.create({
        data: {
          fullName: user.name || user.email.split('@')[0],
          email: user.email,
          phone: null,
          organizationId,
          isActive: true
        }
      });

      // Create UserMemberLink
      await prisma.userMemberLink.create({
        data: {
          userId: user.id,
          memberId: member.id,
          organizationId
        }
      });
    } else {
      member = existingMember;
      
      // Check if UserMemberLink exists
      const existingLink = await prisma.userMemberLink.findFirst({
        where: {
          userId: user.id,
          memberId: member.id,
          organizationId
        }
      });

      if (!existingLink) {
        await prisma.userMemberLink.create({
          data: {
            userId: user.id,
            memberId: member.id,
            organizationId
          }
        });
      }
    }

    // Mark email as verified if not already
    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding berhasil!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name
      },
      membership: {
        role: membership.role
      },
      member: {
        id: member.id,
        name: member.fullName,
        email: member.email
      }
    });

  } catch (error) {
    console.error('Error verifying onboarding token:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Alternative endpoint for POST requests
  try {
    const body = await req.json();
    const parsed = VerifySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Create a mock request with the token as query parameter
    const mockUrl = new URL(`http://localhost:3000/api/onboarding/verify?token=${parsed.data.token}`);
    const mockReq = new NextRequest(mockUrl);
    
    return GET(mockReq);
  } catch (error) {
    console.error('Error in POST verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}