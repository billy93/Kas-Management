import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return new NextResponse(
        `<html><body><h1>Error</h1><p>Token atau email tidak valid</p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Cari verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: token,
        expires: {
          gt: new Date()
        }
      }
    });

    if (!verificationToken) {
      return new NextResponse(
        `<html><body><h1>Error</h1><p>Token tidak valid atau sudah kedaluwarsa</p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Update user emailVerified
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() }
    });

    // Hapus token yang sudah digunakan
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token
        }
      }
    });

    // Redirect ke halaman sukses atau dashboard
    return new NextResponse(
      `<html>
        <head>
          <title>Email Terverifikasi</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
            .container { max-width: 500px; margin: 0 auto; }
            .btn { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">Email Berhasil Diverifikasi!</h1>
            <p>Email Anda telah berhasil diverifikasi. Anda sekarang dapat menggunakan semua fitur aplikasi.</p>
            <a href="/dashboard" class="btn">Kembali ke Dashboard</a>
          </div>
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Error verifying email:', error);
    return new NextResponse(
      `<html><body><h1>Error</h1><p>Terjadi kesalahan saat memverifikasi email</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}