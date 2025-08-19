"use client";

import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function OrganizationSelector() {
  const { selectedOrganization, organizations, setSelectedOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  if (loading || !organizations || organizations.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg">
        Loading...
      </div>
    );
  }

  if (organizations && organizations.length === 1) {
    return (
      <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg border">
        🏢 {selectedOrganization?.name || organizations[0].name}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <span className="mr-2">🏢</span>
        <span className="max-w-32 truncate">
          {selectedOrganization?.name || 'Select Organization'}
        </span>
        <svg
          className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="py-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrganization(org);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    selectedOrganization?.id === org.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-2">🏢</span>
                    <span className="truncate">{org.name}</span>
                    {selectedOrganization?.id === org.id && (
                      <span className="ml-auto text-blue-600">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}