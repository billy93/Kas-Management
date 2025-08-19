import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendEmail } from "@/lib/email";
import { requireRole } from "@/lib/rbac";

const InviteSchema = z.object({
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
    const parsed = InviteSchema.safeParse(body);
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

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          emailVerified: null // Will be verified when they first login
        }
      });
    }

    // Create membership
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId,
        role
      }
    });

    // Generate invitation token (simple approach using user ID + org ID + timestamp)
    const inviteToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        organizationId,
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
        <title>Undangan Bergabung - ${organization.name}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🎉 Selamat Datang!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Anda diundang bergabung dengan ${organization.name}</h2>
            <p>Halo ${name || email},</p>
            <p>Anda telah diundang untuk bergabung dengan organisasi <strong>${organization.name}</strong> sebagai <strong>${role === 'ADMIN' ? 'Administrator' : role === 'TREASURER' ? 'Bendahara' : 'Viewer'}</strong>.</p>
            
            <p>Untuk mulai menggunakan sistem manajemen kas, silakan klik tombol di bawah ini:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; border: none; cursor: pointer;">🔗 Bergabung Sekarang</a>
            </div>
            
            <p><strong>Apa yang bisa Anda lakukan:</strong></p>
            <ul style="padding-left: 20px;">
              ${role === 'ADMIN' ? '<li style="margin: 8px 0;">✅ Mengelola semua aspek organisasi</li><li style="margin: 8px 0;">✅ Menambah/menghapus member</li><li style="margin: 8px 0;">✅ Mengatur konfigurasi iuran</li>' : ''}
              ${role === 'TREASURER' ? '<li style="margin: 8px 0;">✅ Mengelola transaksi keuangan</li><li style="margin: 8px 0;">✅ Mencatat pembayaran iuran</li><li style="margin: 8px 0;">✅ Membuat laporan keuangan</li>' : ''}
              ${role === 'VIEWER' ? '<li style="margin: 8px 0;">✅ Melihat laporan keuangan</li><li style="margin: 8px 0;">✅ Melihat status pembayaran</li>' : ''}
              <li style="margin: 8px 0;">✅ Akses dashboard real-time</li>
              <li style="margin: 8px 0;">✅ Notifikasi otomatis</li>
            </ul>
            
            <p><em>Link ini akan mengarahkan Anda untuk login menggunakan akun Gmail Anda.</em></p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px; padding: 20px;">
            <p style="margin: 5px 0;">Jika Anda tidak mengharapkan email ini, silakan abaikan.</p>
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${organization.name}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      console.log('About to send invitation email:', {
        to: email,
        subject: `Undangan Bergabung - ${organization.name}`,
        organizationName: organization.name
      });

      const emailResult = await sendEmail(
        email,
        `Undangan Bergabung - ${organization.name}`,
        emailHtml
      );

      if (emailResult.skipped) {
        return NextResponse.json({
          success: false,
          error: "Email configuration not available"
        }, { status: 500 });
      }

      console.log('Invitation email sent successfully:', emailResult);

      return NextResponse.json({
        success: true,
        message: "Undangan berhasil dikirim",
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
      console.error('Email sending failed - detailed error:', {
        error: emailError,
        message: emailError instanceof Error ? emailError.message : 'Unknown error',
        stack: emailError instanceof Error ? emailError.stack : undefined,
        type: typeof emailError,
        isResponse: emailError instanceof Response
      });
      
      return NextResponse.json({
        success: false,
        error: "Failed to send invitation email",
        details: emailError instanceof Error ? emailError.message : 'Unknown email error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}