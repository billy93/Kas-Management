'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  memberships: {
    organization: {
      id: string;
      name: string;
    };
  }[];
}

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess: () => void;
}

export default function CreateMemberModal({
  isOpen,
  onClose,
  organizationId,
  onSuccess,
}: CreateMemberModalProps) {
  const { data: session } = useSession();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberData, setMemberData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    joinDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchAvailableUsers();
    }
  }, [isOpen, organizationId]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/users/available-for-member?organizationId=${organizationId}`);
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      } else {
        setError('Gagal mengambil data users');
      }
    } catch (error) {
      setError('Terjadi kesalahan saat mengambil data users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = availableUsers.find(user => user.id === userId);
    if (selectedUser) {
      setMemberData(prev => ({
        ...prev,
        fullName: selectedUser.name || '',
        email: selectedUser.email,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Pilih user terlebih dahulu');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/members/create-from-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          organizationId,
          ...memberData,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Gagal membuat member');
      }
    } catch (error) {
      setError('Terjadi kesalahan saat membuat member');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId('');
    setMemberData({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      joinDate: new Date().toISOString().split('T')[0],
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Buat Member dari User</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pilih User *
            </label>
            {loadingUsers ? (
              <div className="text-center py-4">Loading users...</div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => handleUserSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Pilih User --</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.email})
                    {user.emailVerified ? '' : ' - Belum Verifikasi'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={memberData.fullName}
              onChange={(e) => setMemberData(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={memberData.email}
              onChange={(e) => setMemberData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telepon
            </label>
            <input
              type="tel"
              value={memberData.phone}
              onChange={(e) => setMemberData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat
            </label>
            <textarea
              value={memberData.address}
              onChange={(e) => setMemberData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Bergabung *
            </label>
            <input
              type="date"
              value={memberData.joinDate}
              onChange={(e) => setMemberData(prev => ({ ...prev, joinDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Membuat...' : 'Buat Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}