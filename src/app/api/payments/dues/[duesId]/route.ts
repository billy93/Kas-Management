import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function DELETE(req: Request, { params }: { params: { duesId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session as any).uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { duesId } = params;

    // Check if dues exists and user has permission
    const existingDues = await prisma.dues.findUnique({
      where: { id: duesId },
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
        },
        payments: true
      }
    });

    if (!existingDues) {
      return NextResponse.json({ error: "Dues not found" }, { status: 404 });
    }

    if (existingDues.organization.memberships.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete all payments for this dues
    const deletedPayments = await prisma.payment.deleteMany({
      where: { duesId }
    });

    return NextResponse.json({ 
      message: "Payments deleted successfully", 
      deletedCount: deletedPayments.count 
    });
  } catch (error) {
    console.error("Error deleting payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}