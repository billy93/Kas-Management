import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId")!;
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const unpaid = await prisma.dues.findMany({
    where: { organizationId, month, year, OR: [{ status: "PENDING" }, { status: "PARTIAL" }] },
    include: { member: true, payments: true },
  });
  return NextResponse.json({ unpaid });
}
