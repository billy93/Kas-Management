import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendEmail } from "@/lib/email";

const CreateUserFromMemberSchema = z.object({
  memberId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["ADMIN", "TREASURER", "VIEWER"]).default("VIEWER")
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateUserFromMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { memberId, email, name, role } = parsed.data;

    // Get member details
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        organization: true,
        userLinks: true
      }
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Verify current user has access to this organization
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId: member.organizationId },
        }
      }
    });

    if (!currentUser || currentUser.memberships.length === 0) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 });
    }

    // Check if member already has a user link
    if (member.userLinks.length > 0) {
      return NextResponse.json({ error: "Member already has a user account" }, { status: 400 });
    }

    // Check if user with this email already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      // Check if user already has membership in this organization
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: member.organizationId
          }
        }
      });

      if (existingMembership) {
        // Create UserMemberLink
        await prisma.userMemberLink.create({
          data: {
            userId: user.id,
            memberId: member.id,
            organizationId: member.organizationId,
          },
        });

        // Update member email if different
        if (member.email !== email) {
          await prisma.member.update({
            where: { id: memberId },
            data: { email }
          });
        }

        return NextResponse.json({ 
          success: true, 
          message: "User already exists and has been linked to member",
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        });
      }
    }

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || member.fullName,
          emailVerified: null // Will be verified when they first login
        }
      });
    }

    // Create membership
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: member.organizationId,
        role
      }
    });

    // Create UserMemberLink
    await prisma.userMemberLink.create({
      data: {
        userId: user.id,
        memberId: member.id,
        organizationId: member.organizationId,
      },
    });

    // Update member email
    await prisma.member.update({
      where: { id: memberId },
      data: { email }
    });

    // Generate invitation token
    const inviteToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        organizationId: member.organizationId,
        timestamp: Date.now()
      })
    ).toString('base64');

    // Create invitation link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/onboarding/verify?token=${inviteToken}`;

    // Send invitation email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Undangan Bergabung - ${member.organization.name}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🎉 Selamat Datang!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #4F46E5; margin-top: 0;">Anda telah diundang untuk bergabung!</h2>
            <p>Halo <strong>${name || member.fullName}</strong>,</p>
            <p>Anda telah diundang untuk bergabung dengan organisasi <strong>${member.organization.name}</strong> sebagai member yang sudah terdaftar.</p>
            <p>Untuk mengaktifkan akun Anda dan mulai menggunakan sistem, silakan klik tombol di bawah ini:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Aktivasi Akun</a>
            </div>
            <p style="color: #666; font-size: 14px;">Jika tombol di atas tidak berfungsi, Anda dapat menyalin dan menempelkan link berikut ke browser Anda:</p>
            <p style="background: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">${inviteLink}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px; margin: 0;">Email ini dikirim secara otomatis. Jika Anda tidak mengharapkan email ini, silakan abaikan.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const emailResult = await sendEmail(
        email,
        `Undangan Bergabung - ${member.organization.name}`,
        emailHtml
      );

      if (emailResult.skipped) {
        return NextResponse.json({
          success: false,
          error: "Email configuration not available"
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "User created and invitation sent successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        membership: {
          id: membership.id,
          role: membership.role,
          organizationId: membership.organizationId
        },
        inviteLink // For preview purposes
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      return NextResponse.json({
        success: false,
        error: "Failed to send invitation email",
        details: emailError instanceof Error ? emailError.message : 'Unknown email error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating user from member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}