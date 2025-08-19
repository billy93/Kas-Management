import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user access to organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get dues config for the organization
    const duesConfig = await prisma.duesConfig.findFirst({
      where: { organizationId },
    });

    return NextResponse.json({
      duesConfig: duesConfig || {
        amount: 50000,
        currency: 'IDR',
        organizationId,
      },
    });
  } catch (error) {
    console.error('Error fetching dues config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, amount, currency = 'IDR' } = await request.json();

    if (!organizationId || !amount) {
      return NextResponse.json({ error: 'Organization ID and amount are required' }, { status: 400 });
    }

    // Verify user access to organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if dues config already exists
    const existingConfig = await prisma.duesConfig.findFirst({
      where: { organizationId },
    });

    let duesConfig;
    if (existingConfig) {
      // Update existing config
      duesConfig = await prisma.duesConfig.update({
        where: { id: existingConfig.id },
        data: { amount, currency },
      });
    } else {
      // Create new config
      duesConfig = await prisma.duesConfig.create({
        data: {
          organizationId,
          amount,
          currency,
        },
      });
    }

    return NextResponse.json({ duesConfig });
  } catch (error) {
    console.error('Error saving dues config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}