"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Session } from "next-auth";
import OrganizationSelector from "./OrganizationSelector";
import NotificationCenter from "./NotificationCenter";
import { useOrganization } from "@/contexts/OrganizationContext";

interface ResponsiveNavbarProps {
  session: Session | null;
}

export default function ResponsiveNavbar({ session }: ResponsiveNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const { userRole } = useOrganization();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Filter menu categories based on user role
  const getMenuCategories = () => {
    const baseCategories: { [key: string]: { href: string; label: string }[] } = {
      "Financial": [
        { href: "/dues", label: "📅 Manajemen Iuran" },
        { href: "/payments", label: "💳 Iuran & Pembayaran" },
        { href: "/transactions", label: "💰 Transaksi" },
        { href: "/reports", label: "📈 Reports" },
      ],
      "Tools": [
        { href: "/chat", label: "💬 Chat" },
      ],
    };

    // Only show Data Management for ADMIN and TREASURER
    if (userRole === 'ADMIN' || userRole === 'TREASURER') {
      baseCategories["Data Management"] = [
        { href: "/members", label: "👥 Members" },
        { href: "/users", label: "👤 Users" },
        { href: "/user-member-link", label: "🔗 Link User-Member" },
        { href: "/organization", label: "🏢 Organization" },
      ];
    }

    // For VIEWER, only show Reports from Financial
    if (userRole === 'VIEWER') {
      baseCategories["Financial"] = [
        { href: "/dues", label: "📅 Manajemen Iuran" },
        { href: "/reports", label: "📈 Reports" },
      ];
    }

    return baseCategories;
  };

  const menuCategories = getMenuCategories();

  const getStandaloneMenuItems = () => {
    const items = [
      { href: "/dashboard", label: "📊 Dashboard" }
    ];
    
    // Add admin link for ADMIN and OWNER roles
    if (userRole === 'ADMIN' || userRole === 'OWNER') {
      items.push({ href: "/admin", label: "⚙️ Admin Panel" });
    }
    
    return items;
  };

  const standaloneMenuItems = getStandaloneMenuItems();

  const handleDropdownToggle = (category: string) => {
    setActiveDropdown(activeDropdown === category ? null : category);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="border-b bg-white shadow-sm" ref={navRef}>
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            onClick={closeMenu}
          >
            💰 Kas App
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-1">
            {session ? (
              <>
                {/* Standalone Menu Items */}
                {standaloneMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
                
                {/* Dropdown Categories */}
                {Object.entries(menuCategories).map(([category, items]) => (
                  <div key={category} className="relative">
                    <button
                      onClick={() => handleDropdownToggle(category)}
                      className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium flex items-center space-x-1"
                    >
                      <span>{category}</span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          activeDropdown === category ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {activeDropdown === category && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="py-2">
                          {items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                              onClick={closeDropdown}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="ml-4">
                  <OrganizationSelector />
                </div>
                <div className="ml-4">
                  <NotificationCenter />
                </div>
                <div className="ml-4 pl-4 border-l border-gray-200">
                  <form action="/api/auth/signout" method="post">
                    <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 font-medium">
                      🚪 Sign out
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <form action="/api/auth/signin" method="post">
                <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 font-medium">
                  🔑 Sign in
                </button>
              </form>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            {session ? (
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            ) : (
              <form action="/api/auth/signin" method="post">
                <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm">
                  🔑 Sign in
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {session && (
          <div
            className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${
              isMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="py-4 space-y-3 border-t border-gray-200 mt-3">
              {/* Standalone Menu Items */}
              {standaloneMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Categorized Menu Items */}
              {Object.entries(menuCategories).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <div className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {category}
                  </div>
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-6 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 ml-2"
                      onClick={closeMenu}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
              <div className="pt-2 mt-4 border-t border-gray-200">
                <form action="/api/auth/signout" method="post">
                  <button 
                    className="w-full text-left px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 font-medium"
                    onClick={closeMenu}
                  >
                    🚪 Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}