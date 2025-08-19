import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { duesId, amount, method, note, createdById } = await req.json();
  if (!duesId || !amount) return NextResponse.json({ error: "duesId, amount required" }, { status: 400 });
  const dues = await prisma.dues.findUnique({ where: { id: duesId }, include: { payments: true } });
  if (!dues) return NextResponse.json({ error: "Dues not found" }, { status: 404 });
  const paid = dues.payments.reduce((a, p) => a + p.amount, 0) + amount;
  const status = paid >= dues.amount ? "PAID" : "PARTIAL";
  await prisma.$transaction([
    prisma.payment.create({ data: { duesId, memberId: dues.memberId, amount, method, note, createdById } }),
    prisma.dues.update({ where: { id: duesId }, data: { status } })
  ]);
  return NextResponse.json({ ok: true });
}
