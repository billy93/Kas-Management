# KasApp – Next.js + Tailwind + PostgreSQL + Google Login + JWT (30d) + Vercel AI SDK + Reminders

## Features
- Multi-Organization (RT/kelompok) + RBAC (ADMIN/TREASURER/VIEWER)
- Members, Dues (monthly), Payments, Transactions
- Chatbot (Vercel AI SDK) with tools: get_unpaid, get_arrears, get_balance
- Email (Resend) + WhatsApp Cloud API reminders (Vercel Cron monthly)
- Deployed on Vercel

## Setup

1. Copy `.env.example` -> `.env.local` and fill values.
2. `pnpm i` (or `npm i`/`yarn`)
3. `pnpm migrate`
4. `pnpm seed`
5. `pnpm dev`

## Deploy
- Add env vars in Vercel project (same as `.env.example`).
- `vercel.json` includes a monthly cron at 09:00 UTC on day 1 to hit `/api/reminders/monthly`.

## Reminder Providers
- Email: Resend (set `RESEND_API_KEY` and `REMINDER_FROM_EMAIL`).
- WhatsApp: WhatsApp Cloud API (set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`). Members use `phone` in MSISDN (e.g., 62812...).

## Notes
- Default seeded organization: `seed-org`.
- Adjust org selection & RBAC gates in production flows.
