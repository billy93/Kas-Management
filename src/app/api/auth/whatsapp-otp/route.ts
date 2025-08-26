import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendWhatsAppOTP } from '@/lib/whatsapp';

// Schema for requesting OTP
const RequestOTPSchema = z.object({
  phoneNumber: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/)
});

// Schema for verifying OTP
const VerifyOTPSchema = z.object({
  phoneNumber: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/),
  otp: z.string().length(6)
});

// Store OTP temporarily (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expires: number; attempts: number }>();

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Clean expired OTPs
function cleanExpiredOTPs() {
  const now = Date.now();
  for (const [phone, data] of otpStore.entries()) {
    if (data.expires < now) {
      otpStore.delete(phone);
    }
  }
}

// Request OTP endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'request') {
      const parsed = RequestOTPSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }

      const { phoneNumber } = parsed.data;
      
      // Normalize phone number for Indonesian format
      let normalizedPhone;
      if (phoneNumber.startsWith('0')) {
        // Remove leading 0 and add +62
        normalizedPhone = '+62' + phoneNumber.slice(1);
      } else if (phoneNumber.startsWith('62')) {
        // Add + if missing
        normalizedPhone = '+' + phoneNumber;
      } else if (phoneNumber.startsWith('+62')) {
        // Already in correct format
        normalizedPhone = phoneNumber;
      } else if (phoneNumber.startsWith('8')) {
        // Assume Indonesian mobile number without country code
        normalizedPhone = '+62' + phoneNumber;
      } else {
        // Default: add +62
        normalizedPhone = '+62' + phoneNumber;
      }

      console.log('Normalized phone number:', normalizedPhone);
      // Check if user exists with this phone number
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber: normalizedPhone },
        include: {
          memberships: {
            include: {
              organization: true
            }
          }
        }
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: 'No user found with this phone number' },
          { status: 404 }
        );
      }

      if (!existingUser.emailVerified) {
        return NextResponse.json(
          { error: 'User account is not verified' },
          { status: 403 }
        );
      }

      if (existingUser.memberships.length === 0) {
        return NextResponse.json(
          { error: 'User has no organization memberships' },
          { status: 403 }
        );
      }

      // Clean expired OTPs
      cleanExpiredOTPs();

      // Check rate limiting (max 3 attempts per 15 minutes)
      const existing = otpStore.get(normalizedPhone);
      if (existing && existing.attempts >= 3) {
        return NextResponse.json(
          { error: 'Too many OTP requests. Please try again later.' },
          { status: 429 }
        );
      }

      // Generate and store OTP
      const otp = generateOTP();
      const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
      const attempts = existing ? existing.attempts + 1 : 1;
      
      otpStore.set(normalizedPhone, { otp, expires, attempts });

      // Send OTP via WhatsApp
      try {
        await sendWhatsAppOTP(normalizedPhone, otp);
        
        return NextResponse.json({
          success: true,
          message: 'OTP sent successfully',
          phoneNumber: normalizedPhone
        });
      } catch (error) {
        console.error('Failed to send WhatsApp OTP:', error);
        return NextResponse.json(
          { error: 'Failed to send OTP. Please try again.' },
          { status: 500 }
        );
      }
    }

    if (action === 'verify') {
      const parsed = VerifyOTPSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid phone number or OTP format' },
          { status: 400 }
        );
      }

      const { phoneNumber, otp } = parsed.data;
      
      // Normalize phone number for Indonesian format
      let normalizedPhone;
      if (phoneNumber.startsWith('0')) {
        // Remove leading 0 and add +62
        normalizedPhone = '+62' + phoneNumber.slice(1);
      } else if (phoneNumber.startsWith('62')) {
        // Add + if missing
        normalizedPhone = '+' + phoneNumber;
      } else if (phoneNumber.startsWith('+62')) {
        // Already in correct format
        normalizedPhone = phoneNumber;
      } else if (phoneNumber.startsWith('8')) {
        // Assume Indonesian mobile number without country code
        normalizedPhone = '+62' + phoneNumber;
      } else {
        // Default: add +62
        normalizedPhone = '+62' + phoneNumber;
      }

      // Clean expired OTPs
      cleanExpiredOTPs();

      // Check if OTP exists and is valid
      const storedOTP = otpStore.get(normalizedPhone);
      if (!storedOTP) {
        return NextResponse.json(
          { error: 'OTP expired or not found' },
          { status: 400 }
        );
      }

      if (storedOTP.otp !== otp) {
        return NextResponse.json(
          { error: 'Invalid OTP' },
          { status: 400 }
        );
      }

      // OTP is valid, remove it from store
      otpStore.delete(normalizedPhone);

      // Get user data for session
      const user = await prisma.user.findUnique({
        where: { phoneNumber: normalizedPhone },
        include: {
          memberships: {
            include: {
              organization: true
            }
          }
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          memberships: user.memberships.map((m: any) => ({
            id: m.id,
            role: m.role,
            organization: {
              id: m.organization.id,
              name: m.organization.name
            }
          }))
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "request" or "verify"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('WhatsApp OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}