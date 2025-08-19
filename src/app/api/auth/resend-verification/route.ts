import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, userId } = await req.json();

    if (!email || !userId) {
      return NextResponse.json({ error: 'Email dan userId diperlukan' }, { status: 400 });
    }

    // Cek apakah user ada dan belum verified
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email sudah terverifikasi' }, { status: 400 });
    }

    if (user.email !== email) {
      return NextResponse.json({ error: 'Email tidak sesuai' }, { status: 400 });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Hapus token lama jika ada
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email
      }
    });

    // Buat token baru
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires
      }
    });

    // Kirim email verifikasi
    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verifikasi Email Anda</h2>
        <p>Halo ${user.name || 'User'},</p>
        <p>Silakan klik tombol di bawah ini untuk memverifikasi email Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verifikasi Email
          </a>
        </div>
        <p>Atau salin dan tempel link berikut di browser Anda:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #666; font-size: 14px;">Link ini akan kedaluwarsa dalam 24 jam.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">Jika Anda tidak meminta verifikasi ini, abaikan email ini.</p>
      </div>
    `;

    await sendEmail(
      email,
      'Verifikasi Email Anda',
      emailContent
    );

    return NextResponse.json({ 
      message: 'Email verifikasi berhasil dikirim ulang',
      success: true 
    });

  } catch (error) {
    console.error('Error resending verification email:', error);
    return NextResponse.json(
      { error: 'Gagal mengirim email verifikasi' },
      { status: 500 }
    );
  }
}