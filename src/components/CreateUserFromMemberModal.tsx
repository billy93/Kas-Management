'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Member {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  joinDate: string;
  organizationId: string;
  userLinks?: any[];
}

interface CreateUserFromMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSuccess: () => void;
}

export default function CreateUserFromMemberModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}: CreateUserFromMemberModalProps) {
  const { data: session } = useSession();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    sendInvitation: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Update form when member changes
  useEffect(() => {
    if (member) {
      setUserData({
        name: member.fullName,
        email: member.email,
        sendInvitation: true,
      });
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/members/create-user-from-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member.id,
          organizationId: member.organizationId,
          name: userData.name,
          email: userData.email,
          sendInvitation: userData.sendInvitation,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.userCreated) {
          setSuccess(
            `User berhasil dibuat dan ${userData.sendInvitation ? 'email undangan telah dikirim' : 'siap digunakan'}!`
          );
        } else {
          setSuccess('User sudah ada dan berhasil dihubungkan dengan member!');
        }
        
        setTimeout(() => {
          onSuccess();
          onClose();
          resetForm();
        }, 2000);
      } else {
        setError(result.error || 'Gagal membuat user');
      }
    } catch (error) {
      setError('Terjadi kesalahan saat membuat user');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserData({
      name: '',
      email: '',
      sendInvitation: true,
    });
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Buat User untuk Member</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Member:</strong> {member.fullName}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Email:</strong> {member.email}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama User *
            </label>
            <input
              type="text"
              value={userData.name}
              onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Nama lengkap user"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email User *
            </label>
            <input
              type="email"
              value={userData.email}
              onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Email untuk login"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendInvitation"
              checked={userData.sendInvitation}
              onChange={(e) => setUserData(prev => ({ ...prev, sendInvitation: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="sendInvitation" className="ml-2 block text-sm text-gray-700">
              Kirim email undangan aktivasi akun
            </label>
          </div>

          <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded">
            <p><strong>Catatan:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Jika email sudah terdaftar sebagai user, sistem akan menghubungkan member dengan user yang ada</li>
              <li>Jika email belum terdaftar, sistem akan membuat user baru</li>
              <li>User baru akan mendapat email undangan untuk aktivasi akun (jika dicentang)</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Buat User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}