"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface OrganizationContextType {
  selectedOrganization: Organization | null;
  organizations: Organization[];
  setSelectedOrganization: (org: Organization) => void;
  setOrganizations: (orgs: Organization[]) => void;
  loading: boolean;
  userRole: string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/user/organizations');
        if (response.ok) {
          const data = await response.json();
          const orgs = data.organizations || [];
          setOrganizations(orgs);
          
          // Set first organization as default if none selected
          if (orgs.length > 0 && !selectedOrganization) {
            setSelectedOrganization(orgs[0]);
            setUserRole(orgs[0].role);
          }
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [selectedOrganization]);

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        organizations,
        setSelectedOrganization: (org: Organization) => {
          setSelectedOrganization(org);
          setUserRole(org.role);
        },
        setOrganizations,
        loading,
        userRole,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}