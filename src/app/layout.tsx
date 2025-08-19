import "@/styles/globals.css";
import Link from "next/link";
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";
import AuthSessionProvider from "@/components/SessionProvider";
import { Metadata } from "next";
import ResponsiveNavbar from "@/components/ResponsiveNavbar";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

export const metadata: Metadata = {
  title: "Kas App",
  description: "Aplikasi manajemen kas dan iuran organisasi",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="id">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AuthSessionProvider session={session}>
          <OrganizationProvider>
            <ResponsiveNavbar session={session} />
            <main className="max-w-6xl mx-auto p-4">{children}</main>
          </OrganizationProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
