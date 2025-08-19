import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId")!;
  const tx = await prisma.transaction.findMany({ 
    where: { organizationId }, 
    orderBy: { occurredAt: "desc" },
    include: {
      createdBy: {
        select: {
          name: true
        }
      }
    }
  });
  return NextResponse.json(tx);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session as any).uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, type, amount, category, occurredAt, note, createdById } = await req.json();
    if (!organizationId || !type || !amount) {
      return NextResponse.json({ error: "organizationId, type, amount required" }, { status: 400 });
    }

    // Verify user has access to the organization
    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        user: {
          email: session.user.email
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const created = await prisma.transaction.create({
      data: { 
        organizationId, 
        type, 
        amount, 
        category, 
        occurredAt: occurredAt ? new Date(occurredAt) : undefined, 
        note, 
        createdById: createdById || (session as any).uid
      },
      include: {
        createdBy: {
          select: {
            name: true
          }
        }
      }
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
