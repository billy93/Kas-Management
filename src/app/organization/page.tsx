"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Organization {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

interface DuesConfig {
  id?: string;
  organizationId: string;
  amount: number;
  currency: string;
}

interface Member {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  organizationId?: string;
}

interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  user: {
    id: string;
    name?: string;
    email?: string;
  };
}

export default function MasterDataPage() {
  const { data: session } = useSession();
  const { selectedOrganization, isLoading: orgLoading } = useOrganization();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrgForMembers, setSelectedOrgForMembers] = useState<Organization | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [selectedMemberToAssign, setSelectedMemberToAssign] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: ''
  });
  const [showDuesConfigModal, setShowDuesConfigModal] = useState(false);
  const [selectedOrgForDues, setSelectedOrgForDues] = useState<Organization | null>(null);
  const [duesConfig, setDuesConfig] = useState<DuesConfig | null>(null);
  const [duesAmount, setDuesAmount] = useState(50000);
  const [loadingDuesConfig, setLoadingDuesConfig] = useState(false);

  useEffect(() => {
    if (session?.user && !orgLoading) {
      fetchOrganizations();
    }
  }, [session, orgLoading]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgMembers = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const transformedMembers = data.members.map((membership: any) => ({
          id: membership.user.id,
          fullName: membership.user.name,
          email: membership.user.email,
          role: membership.role
        }));
        setOrgMembers(transformedMembers);
      }
    } catch (error) {
      console.error('Error fetching organization members:', error);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      const response = await fetch('/api/members/unassigned');
      if (response.ok) {
        const data = await response.json();
        setAvailableMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching available members:', error);
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      description: org.description || '',
      address: org.address || '',
      phone: org.phone || '',
      email: org.email || ''
    });
  };

  const handleCreate = () => {
    setShowCreateForm(true);
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: ''
    });
  };

  const handleCancel = () => {
    setEditingOrg(null);
    setShowCreateForm(false);
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: ''
    });
  };

  const handleViewMembers = async (org: Organization) => {
    setSelectedOrgForMembers(org);
    setShowMembersModal(true);
    await fetchOrgMembers(org.id);
  };

  const handleAssignMember = async (org: Organization) => {
    setSelectedOrgForMembers(org);
    setShowAssignModal(true);
    await fetchAvailableMembers();
  };

  const handleAssignSubmit = async () => {
    if (!selectedMemberToAssign || !selectedRole || !selectedOrgForMembers) return;

    try {
      const response = await fetch('/api/organizations/assign-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: selectedMemberToAssign,
          organizationId: selectedOrgForMembers.id,
          role: selectedRole
        }),
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedMemberToAssign('');
        setSelectedRole('MEMBER');
        alert('Member berhasil ditambahkan ke organisasi!');
        if (showMembersModal && selectedOrgForMembers) {
          await fetchOrgMembers(selectedOrgForMembers.id);
        }
        await fetchAvailableMembers();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error assigning member:', error);
      alert('Terjadi kesalahan saat menambahkan member.');
    }
  };

  const handleDuesConfig = async (org: Organization) => {
    setSelectedOrgForDues(org);
    setShowDuesConfigModal(true);
    setLoadingDuesConfig(true);
    
    try {
      const response = await fetch(`/api/dues-config?organizationId=${org.id}`);
      if (response.ok) {
        const data = await response.json();
        setDuesConfig(data.duesConfig);
        setDuesAmount(data.duesConfig.amount);
      }
    } catch (error) {
      console.error('Error fetching dues config:', error);
    } finally {
      setLoadingDuesConfig(false);
    }
  };

  const handleSaveDuesConfig = async () => {
    if (!selectedOrgForDues) return;
    
    setLoadingDuesConfig(true);
    try {
      const response = await fetch('/api/dues-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: selectedOrgForDues.id,
          amount: duesAmount,
          currency: 'IDR'
        }),
      });

      if (response.ok) {
        setShowDuesConfigModal(false);
        alert('Konfigurasi iuran berhasil disimpan!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error saving dues config:', error);
      alert('Terjadi kesalahan saat menyimpan konfigurasi.');
    } finally {
      setLoadingDuesConfig(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingOrg ? 'PUT' : 'POST';
      const body = editingOrg ? { id: editingOrg.id, ...formData } : formData;
      
      const response = await fetch('/api/organizations', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchOrganizations();
        handleCancel();
        alert(editingOrg ? 'Organisasi berhasil diperbarui!' : 'Organisasi berhasil dibuat!');
      } else {
        alert('Terjadi kesalahan saat menyimpan data.');
      }
    } catch (error) {
      console.error('Error saving organization:', error);
      alert('Terjadi kesalahan saat menyimpan data.');
    }
  };

  if (!session?.user) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Setup Organisasi</h1>
        <p className="text-gray-600">Silakan login terlebih dahulu.</p>
      </div>
    );
  }

  if (orgLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Setup Organisasi</h1>
        <p className="text-gray-600">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">⚙️ Setup Organisasi</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 font-medium"
        >
          ➕ Tambah Organisasi
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingOrg) && (
        <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editingOrg ? 'Edit Organisasi' : 'Tambah Organisasi Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Organisasi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan nama organisasi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@organisasi.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telepon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="08123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Deskripsi singkat organisasi"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alamat
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Alamat lengkap organisasi"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 font-medium"
              >
                💾 {editingOrg ? 'Update' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 font-medium"
              >
                ❌ Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organizations List */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Daftar Organisasi</h2>
          {organizations.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              Belum ada organisasi. Silakan tambah organisasi baru.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Nama</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Deskripsi</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    {/* <th className="text-left py-3 px-4 font-medium text-gray-700">Member</th> */}
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Dibuat</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{org.name}</div>
                        {org.phone && (
                          <div className="text-sm text-gray-600">{org.phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {org.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {org.email || '-'}
                      </td>
                      {/* <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewMembers(org)}
                            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors duration-200"
                          >
                            👥 Lihat
                          </button>
                          <button
                            onClick={() => handleAssignMember(org)}
                            className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs transition-colors duration-200"
                          >
                            ➕ Assign
                          </button>
                        </div>
                      </td> */}
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(org.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          
                          <button
                            onClick={() => handleDuesConfig(org)}
                            className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs transition-colors duration-200"
                          >
                            💰 Iuran
                          </button>
                          <button
                            onClick={() => handleEdit(org)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors duration-200"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Members Modal */}
      {showMembersModal && selectedOrgForMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Member - {selectedOrgForMembers.name}</h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {orgMembers.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Belum ada member di organisasi ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Nama</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Email</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgMembers.map((member) => (
                      <tr key={member.id} className="border-b border-gray-100">
                        <td className="py-2 px-3">{member.fullName || '-'}</td>
                        <td className="py-2 px-3 text-gray-600">{member.email}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.role === 'ADMIN' 
                              ? 'bg-red-100 text-red-800'
                              : member.role === 'TREASURER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleAssignMember(selectedOrgForMembers)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200"
              >
                ➕ Tambah Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Member Modal */}
      {showAssignModal && selectedOrgForMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Assign Member ke {selectedOrgForMembers.name}</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {availableMembers.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Semua member sudah memiliki organisasi.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pilih Member
                  </label>
                  <select
                    value={selectedMemberToAssign}
                    onChange={(e) => setSelectedMemberToAssign(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Member --</option>
                    {availableMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="TREASURER">Treasurer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleAssignSubmit}
                    disabled={!selectedMemberToAssign}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors duration-200"
                  >
                    💾 Assign
                  </button>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                  >
                    ❌ Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dues Config Modal */}
      {showDuesConfigModal && selectedOrgForDues && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Konfigurasi Iuran - {selectedOrgForDues.name}</h2>
              <button
                onClick={() => setShowDuesConfigModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {loadingDuesConfig ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Memuat konfigurasi...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Iuran per Bulan
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      value={duesAmount}
                      onChange={(e) => setDuesAmount(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="50000"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Preview: {formatCurrency(duesAmount)}
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-blue-500">ℹ️</span>
                    </div>
                    <div className="ml-2">
                      <p className="text-sm text-blue-800">
                        <strong>Catatan:</strong> Perubahan konfigurasi iuran akan berlaku untuk iuran baru yang dibuat setelah ini. Iuran yang sudah ada tidak akan terpengaruh.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleSaveDuesConfig}
                    disabled={loadingDuesConfig || duesAmount <= 0}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors duration-200"
                  >
                    💾 Simpan Konfigurasi
                  </button>
                  <button
                    onClick={() => setShowDuesConfigModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                  >
                    ❌ Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}