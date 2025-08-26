import "@/styles/globals.css";
import Link from "next/link";
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";
import AuthSessionProvider from "@/components/SessionProvider";
import { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import MobileLayout from "@/components/MobileLayout";

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
            <MobileLayout session={session}>
              {children}
            </MobileLayout>
          </OrganizationProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
