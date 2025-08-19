"use client";
import { useState, useEffect } from "react";
import { prisma } from "@/lib/prisma";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Member {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  joinedAt: Date;
  isActive: boolean;
  organizations?: {
    id: string;
    name: string;
    role: string;
  }[];
}

interface PaymentStatus {
  month: number;
  year: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  amount: number;
  paidAmount: number;
}

interface MemberDetailModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
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

        <h3 className="text-lg font-semibold mb-4">Riwayat Pembayaran Iuran (12 Bulan Terakhir)</h3>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentHistory.map((payment) => (
              <div
                key={`${payment.year}-${payment.month}`}
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
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { selectedOrganization, loading: orgLoading } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedOrganization && !orgLoading) {
      fetchMembers();
    }
  }, [selectedOrganization, orgLoading]);

  const fetchMembers = async () => {
    if (!selectedOrganization) return;
    
    try {
      const response = await fetch(`/api/members?organizationId=${selectedOrganization.id}`);
      const data = await response.json();
      setMembers(data);
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
    // TODO: Implement edit functionality
    alert(`Edit member: ${member.fullName}`);
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Members</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Lengkap
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telepon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organisasi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.email || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.phone || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {member.isActive ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleView(member)}
                      className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded bg-blue-100 hover:bg-blue-200"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-yellow-600 hover:text-yellow-900 px-3 py-1 rounded bg-yellow-100 hover:bg-yellow-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      className="text-red-600 hover:text-red-900 px-3 py-1 rounded bg-red-100 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Tidak ada member yang ditemukan
          </div>
        )}
      </div>

      <MemberDetailModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
