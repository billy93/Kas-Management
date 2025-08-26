"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import OrganizationSelector from "./OrganizationSelector";
import NotificationCenter from "./NotificationCenter";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePathname } from "next/navigation";

interface SidebarProps {
  session: Session | null;
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export default function Sidebar({ session, isMobileMenuOpen = false, onMobileMenuClose }: SidebarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { userRole } = useOrganization();
  const pathname = usePathname();



  // Filter menu categories based on user role
  const getMenuCategories = () => {
    const baseCategories: { [key: string]: { href: string; label: string; icon: string }[] } = {
      "Financial": [
        { href: "/dues", label: "Manajemen Iuran", icon: "📅" },
        { href: "/payments", label: "Iuran & Pembayaran", icon: "💳" },
        { href: "/transactions", label: "Transaksi", icon: "💰" },
        // { href: "/reports", label: "Reports", icon: "📈" },
      ],
      "Tools": [
        { href: "/chat", label: "Chat", icon: "💬" },
      ],
    };

    // Only show Data Management for ADMIN and TREASURER
    if (userRole === 'ADMIN' || userRole === 'TREASURER') {
      baseCategories["Data Management"] = [
        { href: "/members", label: "Members", icon: "👥" },
        { href: "/users", label: "Users", icon: "👤" },
        { href: "/user-member-link", label: "Link User-Member", icon: "🔗" },
        { href: "/organization", label: "Organization", icon: "🏢" },
      ];
    }

    // For VIEWER, only show Reports from Financial
    if (userRole === 'VIEWER') {
      baseCategories["Financial"] = [
        { href: "/dues", label: "Manajemen Iuran", icon: "📅" },
        { href: "/reports", label: "Reports", icon: "📈" },
      ];
    }

    return baseCategories;
  };

  const menuCategories = getMenuCategories();

  const getStandaloneMenuItems = () => {
    const items = [
      { href: "/dashboard", label: "Dashboard", icon: "📊" }
    ];
    
    // Add admin link for ADMIN and OWNER roles
    if (userRole === 'ADMIN' || userRole === 'OWNER') {
      items.push({ href: "/admin", label: "Admin Panel", icon: "⚙️" });
    }
    
    return items;
  };

  const standaloneMenuItems = getStandaloneMenuItems();

  const handleDropdownToggle = (category: string) => {
    setActiveDropdown(activeDropdown === category ? null : category);
  };

  const isActiveLink = (href: string) => {
    return pathname === href;
  };



  if (!session) {
    return null; // Don't show sidebar if not authenticated
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileMenuClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Link 
            href="/" 
            className="font-bold text-xl text-blue-600 hover:text-blue-700 transition-colors"
            onClick={onMobileMenuClose}
          >
            💰 Kas App
          </Link>
          
          {/* Close button for mobile */}
          <button
            onClick={onMobileMenuClose}
            className="lg:hidden p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Standalone Menu Items */}
          <div className="px-3 mb-6">
            {standaloneMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 mb-1 ${
                  isActiveLink(item.href)
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
                onClick={onMobileMenuClose}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="ml-3 font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Categorized Menu Items */}
          {Object.entries(menuCategories).map(([category, items]) => (
            <div key={category} className="px-3 mb-4">
              <button
                onClick={() => handleDropdownToggle(category)}
                className="flex items-center justify-between w-full px-3 py-2 text-left text-sm font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
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
              
              <div className={`space-y-1 ${
                activeDropdown === category ? 'block' : 'hidden'
              }`}>
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ml-2 ${
                      isActiveLink(item.href)
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={onMobileMenuClose}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 p-3">
          {/* Organization Selector */}
          <div className="mb-3">
            <OrganizationSelector />
          </div>
          
          {/* Notification Center */}
          {/* <div className="mb-3">
            <NotificationCenter />
          </div> */}
          
          {/* Sign Out */}
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full px-3 py-2 bg-gray-800 hover:bg-black text-white rounded-lg transition-colors duration-200 font-medium flex items-center justify-start"
          >
            <span className="text-lg">🚪</span>
            <span className="ml-2">Sign out</span>
          </button>
        </div>
      </div>


    </>
  );
}