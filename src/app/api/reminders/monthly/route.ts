import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  // Triggered by Vercel Cron monthly, body may include { month, year, organizationId }
  const { month, year, organizationId } = await req.json().catch(() => ({}));
  const dt = new Date();
  const m = month || (dt.getMonth() + 1);
  const y = year || dt.getFullYear();

  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 });

  const dues = await prisma.dues.findMany({
    where: { organizationId, month: m, year: y, OR: [{ status: "PENDING" }, { status: "PARTIAL" }] },
    include: { member: true, payments: true }
  });

  let sent = 0;
  for (const d of dues) {
    const remaining = d.amount - d.payments.reduce((a, p) => a + p.amount, 0);
    const subject = `Pengingat iuran bulan ${m}/${y}`;
    const text = `Halo ${d.member.fullName},

Anda memiliki tagihan iuran sebesar IDR ${remaining}. Mohon segera melakukan pembayaran. Terima kasih.`;
    const html = `<p>Halo <b>${d.member.fullName}</b>,</p><p>Anda memiliki tagihan iuran sebesar <b>IDR ${remaining}</b> untuk bulan ${m}/${y}. Mohon segera melakukan pembayaran. Terima kasih.</p>`;
    if (d.member.email) {
      await sendEmail(d.member.email, subject, html);
      sent++;
    }
    if (d.member.phone) {
      try { await sendWhatsApp(d.member.phone, text); sent++; } catch {}
    }
  }
  return NextResponse.json({ ok: true, sent, month: m, year: y });
}
