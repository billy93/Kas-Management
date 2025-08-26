"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { useOrganization } from "@/contexts/OrganizationContext";
import CreateMemberModal from '@/components/CreateMemberModal';
import CreateUserFromMemberModal from '@/components/CreateUserFromMemberModal';
import ImportMemberModal from '@/components/ImportMemberModal';

interface Member {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  joinedAt: Date;
  isActive: boolean;
  organizations?: {
    id: string;
    name: string;
    role: string;
  }[];
  userLinks?: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
}

interface PaymentStatus {
  month: number;
  year: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  amount: number;
  paidAmount: number;
  organizationId?: string;
  organizationName?: string;
}

interface MemberDetailModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EditMemberModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated: () => void;
}

interface AssignMemberModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onMemberAssigned: () => void;
}

function MemberDetailModal({ member, isOpen, onClose }: MemberDetailModalProps) {
  const [paymentHistory, setPaymentHistory] = useState<PaymentStatus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member && isOpen) {
      fetchPaymentHistory(member.id);
    }
  }, [member, isOpen]);

  const fetchPaymentHistory = async (memberId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}/payment-history`);
      const data = await response.json();
      setPaymentHistory(data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Detail Member: {member.fullName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Email:</strong> {member.email || 'Tidak ada'}</div>
            <div><strong>Telepon:</strong> {member.phone || 'Tidak ada'}</div>
            <div><strong>Bergabung:</strong> {new Date(member.joinedAt).toLocaleDateString('id-ID')}</div>
            <div><strong>Status:</strong> {member.isActive ? 'Aktif' : 'Tidak Aktif'}</div>
          </div>
          
          {member.organizations && member.organizations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Organisasi:</h4>
              <div className="flex flex-wrap gap-2">
                {member.organizations.map((org) => (
                  <span
                    key={org.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {org.name} ({org.role})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold mb-4">Riwayat Pembayaran Iuran</h3>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : paymentHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Belum ada tagihan iuran untuk member ini
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group by organization if multiple organizations */}
            {(() => {
              const groupedByOrg = paymentHistory.reduce((acc, payment) => {
                const orgKey = payment.organizationName || 'Tanpa Organisasi';
                if (!acc[orgKey]) acc[orgKey] = [];
                acc[orgKey].push(payment);
                return acc;
              }, {} as Record<string, PaymentStatus[]>);
              
              return Object.entries(groupedByOrg).map(([orgName, payments]) => (
                <div key={orgName} className="mb-6">
                  {Object.keys(groupedByOrg).length > 1 && (
                    <h4 className="font-semibold text-md mb-3 text-blue-700 border-b border-blue-200 pb-2">
                      {orgName}
                    </h4>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {payments.map((payment) => (
                      <div
                        key={`${payment.organizationId}-${payment.year}-${payment.month}`}
                        className={`p-4 rounded-lg border ${
                          payment.status === 'PAID' ? 'bg-green-50 border-green-200' :
                          payment.status === 'PARTIAL' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="font-medium">
                          {getMonthName(payment.month)} {payment.year}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Target: Rp {payment.amount.toLocaleString('id-ID')}
                        </div>
                        <div className="text-sm text-gray-600">
                          Dibayar: Rp {payment.paidAmount.toLocaleString('id-ID')}
                        </div>
                        <div className="mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(payment.status)}`}>
                            {payment.status === 'PAID' ? 'Lunas' :
                             payment.status === 'PARTIAL' ? 'Sebagian' : 'Belum Bayar'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()
            }
          </div>
        )}
      </div>
    </div>
  );
}

function EditMemberModal({ member, isOpen, onClose, onMemberUpdated }: EditMemberModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setFullName(member.fullName);
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setAddress(member.address || '');
      setIsActive(member.isActive);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email: email || null,
          phone: phone || null,
          address: address || null,
          isActive,
        }),
      });

      if (response.ok) {
        onMemberUpdated();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Gagal memperbarui member');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Member</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telepon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Member Aktif
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignMemberModal({ member, isOpen, onClose, onMemberAssigned }: AssignMemberModalProps) {
  const [organizations, setOrganizations] = useState<{id: string, name: string}[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();
      setOrganizations(data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedOrgId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/members/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member.id,
          organizationId: selectedOrgId,
        }),
      });

      if (response.ok) {
        onMemberAssigned();
        onClose();
        setSelectedOrgId('');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error assigning member:', error);
      alert('Gagal assign member ke organisasi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Assign Member ke Organisasi</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Member: <span className="font-medium">{member.fullName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Organisasi *
            </label>
            {loadingOrgs ? (
              <div className="text-sm text-gray-500">Loading organizations...</div>
            ) : (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Pilih organisasi...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !selectedOrgId}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { selectedOrganization, loading: orgLoading } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCreateMemberModalOpen, setIsCreateMemberModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'current' | 'all'>('current');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (selectedOrganization && !orgLoading) {
      fetchMembers();
    }
  }, [selectedOrganization, orgLoading, viewMode]);

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render page if not authenticated
  if (!session) {
    return null;
  }

  const fetchMembers = async () => {
    if (!selectedOrganization) return;
    
    try {
      // Fetch members for current organization
      const currentResponse = await fetch(`/api/members?organizationId=${selectedOrganization.id}`);
      const currentData = await currentResponse.json();
      console.log('currentData', currentData);
      setMembers(currentData);
      
      // Fetch all members across organizations
      const allResponse = await fetch('/api/members/all');
      const allData = await allResponse.json();
      setAllMembers(allData);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (member: Member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setIsEditModalOpen(true);
  };

  const handleAssign = (member: Member) => {
    setSelectedMember(member);
    setIsAssignModalOpen(true);
  };

  const handleDelete = async (member: Member) => {
    if (confirm(`Apakah Anda yakin ingin menghapus member ${member.fullName}?`)) {
      try {
        await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
        fetchMembers(); // Refresh the list
      } catch (error) {
        console.error('Error deleting member:', error);
        alert('Gagal menghapus member');
      }
    }
  };

  if (loading || orgLoading || !selectedOrganization) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Members</h1>
        <div className="text-center py-4">
          {orgLoading ? 'Loading organizations...' : 
           !selectedOrganization ? 'Please select an organization' : 
           'Loading members...'}
        </div>
      </div>
    );
  }

  const displayMembers = viewMode === 'current' ? members : allMembers;
  
  // Group members by organization for 'all' view
  const groupedMembers = viewMode === 'all' 
    ? displayMembers.reduce((acc, member) => {
        if (member.organizations && member.organizations.length > 0) {
          member.organizations.forEach(org => {
            if (!acc[org.name]) acc[org.name] = [];
            acc[org.name].push(member);
          });
        } else {
          if (!acc['Tanpa Organisasi']) acc['Tanpa Organisasi'] = [];
          acc['Tanpa Organisasi'].push(member);
        }
        return acc;
      }, {} as Record<string, Member[]>)
    : { [selectedOrganization?.name || 'Current Organization']: displayMembers };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Members</h1>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setViewMode('current')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'current'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Organisasi Saat Ini
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Semua Organisasi
          </button>
        </div>
      </div>
      
      {/* Action Buttons */}
      {viewMode === 'current' && selectedOrganization && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setIsCreateMemberModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Buat Member dari User
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import Members
          </button>
        </div>
      )}
      
      {Object.entries(groupedMembers).map(([orgName, orgMembers]) => (
        <div key={orgName} className="space-y-4">
          {viewMode === 'all' && (
            <h2 className="text-xl font-semibold text-blue-700 border-b border-blue-200 pb-2">
              {orgName} ({orgMembers.length} member{orgMembers.length !== 1 ? 's' : ''})
            </h2>
          )}
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Lengkap
              </th>
              <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telepon
              </th>
              <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organisasi
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orgMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 sm:px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
                    {/* Show email and phone on mobile */}
                    <div className="md:hidden mt-1">
                      <div className="text-sm text-gray-500">{member.email || 'No email'}</div>
                      <div className="lg:hidden text-sm text-gray-500">{member.phone || 'No phone'}</div>
                    </div>
                    {/* Show organization on mobile */}
                    <div className="sm:hidden mt-1">
                      {member.organizations && member.organizations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.organizations.slice(0, 1).map((org) => (
                            <span
                              key={org.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                            >
                              {org.name}
                            </span>
                          ))}
                          {member.organizations.length > 1 && (
                            <span className="text-xs text-gray-500">
                              +{member.organizations.length - 1} lainnya
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No organization</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.email || '-'}</div>
                </td>
                <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.phone || '-'}</div>
                </td>
                <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {member.organizations && member.organizations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {member.organizations.slice(0, 2).map((org) => (
                          <span
                            key={org.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                          >
                            {org.name}
                          </span>
                        ))}
                        {member.organizations.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{member.organizations.length - 2} lainnya
                          </span>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {member.isActive ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <button
                        onClick={() => handleView(member)}
                        className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200"
                      >
                        <svg className="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">View</span>
                      </button>

                       <button
                        onClick={() => handleEdit(member)}
                        className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-300 focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 transition-all duration-200"
                      >
                        <svg className="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    {/* <button
                      onClick={() => handleAssign(member)}
                      className="text-purple-600 hover:text-purple-900 px-3 py-1 rounded bg-purple-100 hover:bg-purple-200"
                    >
                      Assign
                    </button> */}
                    {!member.userLinks || member.userLinks.length === 0 ? (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setIsCreateUserModalOpen(true);
                        }}
                        className="text-orange-600 hover:text-orange-900 text-xs px-2 py-1 bg-orange-100 rounded"
                        title="Member ini belum memiliki user"
                      >
                        Buat User
                      </button>
                    ) : (
                      <></>
                      // <span className="text-xs text-green-600 px-2 py-1 bg-green-100 rounded">
                      //   ✓ Ada User
                      // </span>
                    )}
                     <button
                        onClick={() => handleDelete(member)}
                        className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200"
                      >
                        <svg className="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    {/* <button
                      onClick={() => handleDelete(member)}
                      className="text-red-600 hover:text-red-900 px-3 py-1 rounded bg-red-100 hover:bg-red-200"
                    >
                      Delete
                    </button> */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
            </div>
        
        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Tidak ada member yang ditemukan
          </div>
        )}
      </div>
        </div>
      ))}

      <MemberDetailModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      
      <EditMemberModal
         member={selectedMember}
         isOpen={isEditModalOpen}
         onClose={() => {
           setIsEditModalOpen(false);
           setSelectedMember(null);
         }}
         onMemberUpdated={() => {
           fetchMembers();
           setIsEditModalOpen(false);
           setSelectedMember(null);
         }}
       />
       
       <AssignMemberModal
         member={selectedMember}
         isOpen={isAssignModalOpen}
         onClose={() => {
           setIsAssignModalOpen(false);
           setSelectedMember(null);
         }}
         onMemberAssigned={() => {
           fetchMembers();
           setIsAssignModalOpen(false);
           setSelectedMember(null);
         }}
       />
       
       <CreateMemberModal
          isOpen={isCreateMemberModalOpen}
          onClose={() => setIsCreateMemberModalOpen(false)}
          organizationId={selectedOrganization?.id || ''}
          onSuccess={fetchMembers}
        />
        
        <CreateUserFromMemberModal
          member={selectedMember}
          isOpen={isCreateUserModalOpen}
          onClose={() => {
            setIsCreateUserModalOpen(false);
            setSelectedMember(null);
          }}
          onSuccess={() => {
            fetchMembers();
            setIsCreateUserModalOpen(false);
            setSelectedMember(null);
          }}
        />
        
        <ImportMemberModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          organizationId={selectedOrganization?.id || ''}
          onSuccess={fetchMembers}
        />
     </div>
   );
}
