"use client";

import { useState } from "react";
import { Session } from "next-auth";
import Sidebar from "./Sidebar";
import { signOut } from "next-auth/react";

interface MobileLayoutProps {
  session: Session | null;
  children: React.ReactNode;
}

export default function MobileLayout({ session, children }: MobileLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (!session) {
    return (
      <main className="min-h-screen">
        {children}
      </main>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar 
        session={session} 
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={closeMobileMenu}
      />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto transition-all duration-300 lg:ml-64">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          
          <h1 className="font-bold text-xl text-blue-600">
            💰 Kas App
          </h1>
          
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Sign out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}