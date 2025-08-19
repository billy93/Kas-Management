import Link from "next/link";
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    return (
      <div className="py-10">
        <h1 className="text-2xl font-bold mb-2">Selamat datang di KasApp</h1>
        <p className="mb-4">Kelola pemasukan, pengeluaran, dan iuran kas bulanan.</p>
        <Link className="px-4 py-2 rounded bg-black text-white" href="/dashboard">Masuk ke Dashboard</Link>
      </div>
    )
  }
  return (
    <div className="py-10 space-y-4">
      <h1 className="text-2xl font-bold">KasApp</h1>
      <p>Silakan masuk menggunakan akun Google Anda untuk mulai.</p>
      <form action="/api/auth/signin" method="post">
        <button className="px-4 py-2 rounded bg-black text-white">Sign in with Google</button>
      </form>
    </div>
  );
}
