'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  memberships: {
    role: string;
    organization: {
      id: string;
      name: string;
    };
  }[];
  linkedMember?: Member;
}

interface Member {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  joinedAt: string;
  linkedUser?: User;
}

interface UserMemberLink {
  id: string;
  userId: string;
  memberId: string;
  createdAt: string;
  user: User;
  member: Member;
}

export default function UserMemberLinkPage() {
  const { selectedOrganization } = useOrganization();
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [links, setLinks] = useState<UserMemberLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    if (selectedOrganization) {
      fetchData();
    }
  }, [selectedOrganization]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersResponse = await fetch(`/api/users?organizationId=${selectedOrganization?.id}`);
      const usersData = await usersResponse.json();
      
      // Fetch members
      const membersResponse = await fetch(`/api/members?organizationId=${selectedOrganization?.id}`);
      const membersData = await membersResponse.json();
      
      // Fetch existing links
      const linksResponse = await fetch(`/api/user-member-links?organizationId=${selectedOrganization?.id}`);
      const linksData = await linksResponse.json();
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setLinks(Array.isArray(linksData) ? linksData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setUsers([]);
      setMembers([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!selectedUser || !selectedMember) return;
    
    try {
      const response = await fetch('/api/user-member-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          memberId: selectedMember.id,
          organizationId: selectedOrganization?.id,
        }),
      });
      
      if (response.ok) {
        setShowLinkModal(false);
        setSelectedUser(null);
        setSelectedMember(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating link:', error);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus hubungan ini?')) return;
    
    try {
      const response = await fetch(`/api/user-member-links/${linkId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const getUnlinkedUsers = () => {
    if (!Array.isArray(links) || !Array.isArray(users)) return [];
    const linkedUserIds = links.map(link => link.userId);
    return users.filter(user => !linkedUserIds.includes(user.id));
  };

  const getUnlinkedMembers = () => {
    if (!Array.isArray(links) || !Array.isArray(members)) return [];
    const linkedMemberIds = links.map(link => link.memberId);
    return members.filter(member => !linkedMemberIds.includes(member.id));
  };

  if (!selectedOrganization) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Silakan pilih organisasi terlebih dahulu
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Memuat data...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Hubungkan User dengan Member
        </h1>
        <p className="text-gray-600">
          Kelola hubungan antara akun user dengan data member untuk sinkronisasi transaksi
        </p>
      </div>

      {/* Action Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowLinkModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          disabled={getUnlinkedUsers().length === 0 || getUnlinkedMembers().length === 0}
        >
          + Hubungkan User & Member
        </button>
      </div>

      {/* Existing Links Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Hubungan yang Sudah Ada ({Array.isArray(links) ? links.length : 0})
          </h2>
        </div>
        
        {!Array.isArray(links) || links.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Belum ada hubungan user-member yang dibuat
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dibuat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(links) && links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {link.user.name || 'Tidak ada nama'}
                        </div>
                        <div className="text-sm text-gray-500">{link.user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {link.member.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {link.member.email || link.member.phone || 'Tidak ada kontak'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(link.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link Creation Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Hubungkan User dengan Member
              </h3>
              
              <div className="space-y-4">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih User
                  </label>
                  <select
                    value={selectedUser?.id || ''}
                    onChange={(e) => {
                      const user = getUnlinkedUsers().find(u => u.id === e.target.value);
                      setSelectedUser(user || null);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih User --</option>
                    {getUnlinkedUsers().map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || 'Tidak ada nama'} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Member Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Member
                  </label>
                  <select
                    value={selectedMember?.id || ''}
                    onChange={(e) => {
                      const member = getUnlinkedMembers().find(m => m.id === e.target.value);
                      setSelectedMember(member || null);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Member --</option>
                    {getUnlinkedMembers().map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName} ({member.email || member.phone || 'Tidak ada kontak'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setSelectedUser(null);
                    setSelectedMember(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateLink}
                  disabled={!selectedUser || !selectedMember}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Hubungkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}