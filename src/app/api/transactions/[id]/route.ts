import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session as any).uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, amount, category, occurredAt, note } = await req.json();
    const { id } = params;

    if (!type || !amount) {
      return NextResponse.json({ error: "Type and amount are required" }, { status: 400 });
    }

    // Check if transaction exists and user has permission
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            memberships: {
              where: {
                user: {
                  email: session.user.email
                }
              }
            }
          }
        }
      }
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (existingTransaction.organization.memberships.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        type,
        amount: parseInt(amount),
        category: category || null,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
        note: note || null,
      },
      include: {
        createdBy: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session as any).uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Check if transaction exists and user has permission
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            memberships: {
              where: {
                user: {
                  email: session.user.email
                }
              }
            }
          }
        }
      }
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (existingTransaction.organization.memberships.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.transaction.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}