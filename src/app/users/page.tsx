"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/contexts/OrganizationContext";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName: string;
  organizationId: string;
  onInviteSent: () => void;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName: string;
  organizationId: string;
  onUserCreated: () => void;
}

function InviteModal({ isOpen, onClose, organizationName, organizationId, onInviteSent }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  const [role, setRole] = useState("VIEWER");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePhoneNumber = (phone: string, code: string) => {
    if (!phone) return { isValid: true, formatted: null };
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    if (!digits) return { isValid: true, formatted: null };
    
    // Validate Indonesian phone number format
    if (code === '+62') {
      // Indonesian mobile numbers should start with 8 and be 9-12 digits
      if (!/^8\d{8,11}$/.test(digits)) {
        return { 
          isValid: false, 
          formatted: null,
          error: 'Nomor telepon Indonesia harus dimulai dengan 8 dan memiliki 9-12 digit'
        };
      }
    }
    
    return { isValid: true, formatted: code + digits };
  };

  const formatPhoneNumber = (phone: string, code: string) => {
    const validation = validatePhoneNumber(phone, code);
    return validation.formatted;
  };

  const handleSendInvite = async () => {
    if (!email) return;
    
    // Validate phone number
    const phoneValidation = validatePhoneNumber(phoneNumber, countryCode);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || 'Format nomor telepon tidak valid');
      return;
    }
    setPhoneError('');
    
    setLoading(true);
    try {
      const formattedPhone = phoneValidation.formatted;
      
      const response = await fetch('/api/onboarding/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
          phoneNumber: formattedPhone,
          organizationId,
          role
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Undangan berhasil dikirim!');
        setEmail("");
        setName("");
        setPhoneNumber("");
        setCountryCode("+62");
        setPhoneError("");
        setRole("VIEWER");
        setShowPreview(false);
        onInviteSent();
        onClose();
      } else {
        alert(`Gagal mengirim undangan: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Gagal mengirim undangan: Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Undang User Baru</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama (Opsional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nama lengkap"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Telepon (Opsional)
            </label>
            <div className="flex">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              >
                <option value="+62">🇮🇩 +62</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+60">🇲🇾 +60</option>
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="858xxxxxxxx"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Contoh: 858xxxxxxxx (tanpa 0 di depan)
            </p>
            {phoneError && (
              <p className="text-xs text-red-500 mt-1">
                {phoneError}
              </p>
            )}
            {phoneError && (
              <p className="text-xs text-red-500 mt-1">
                {phoneError}
              </p>
            )}
            {phoneError && (
              <p className="text-xs text-red-500 mt-1">
                {phoneError}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="VIEWER">Viewer</option>
              <option value="TREASURER">Bendahara</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Organisasi:</strong> {organizationName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              User akan menerima email undangan untuk bergabung dengan organisasi ini.
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSendInvite}
              disabled={!email || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Mengirim...' : 'Kirim Undangan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({ isOpen, onClose, organizationName, organizationId, onUserCreated }: CreateUserModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  const [phoneError, setPhoneError] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (phone: string, code: string) => {
    if (!phone) return null;
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    
    // Format with country code
    return code + digits;
  };

  const handleCreateUser = async () => {
    if (!email) return;
    
    // Validate phone number
    const phoneValidation = validatePhoneNumber(phoneNumber, countryCode);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || 'Format nomor telepon tidak valid');
      return;
    }
    setPhoneError('');
    
    setLoading(true);
    try {
      const formattedPhone = phoneValidation.formatted;
      
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
          phoneNumber: formattedPhone,
          organizationId,
          role
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('User berhasil dibuat!');
        setEmail("");
        setName("");
        setPhoneNumber("");
        setCountryCode("+62");
        setPhoneError("");
        setRole("VIEWER");
        onUserCreated();
        onClose();
      } else {
        alert(`Gagal membuat user: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Gagal membuat user: Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Tambah User Baru</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nama lengkap (opsional)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Telepon
            </label>
            <div className="flex">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              >
                <option value="+62">🇮🇩 +62</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+60">🇲🇾 +60</option>
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="858xxxxxxxx"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Contoh: 858xxxxxxxx (tanpa 0 di depan)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="VIEWER">Viewer</option>
              <option value="TREASURER">Bendahara</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-blue-500">ℹ️</span>
              </div>
              <div className="ml-2 text-sm text-blue-700">
                <p><strong>Catatan:</strong></p>
                <p>User akan langsung dibuat dengan email terverifikasi otomatis. Tidak ada email konfirmasi yang akan dikirim.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Batal
          </button>
          <button
            onClick={handleCreateUser}
            disabled={!email || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Membuat...</span>
              </>
            ) : (
              <>
                <span>👤</span>
                <span>Buat User</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface User {
  id: string;
  name?: string;
  email: string;
  phoneNumber?: string;
  emailVerified: boolean;
  createdAt: string;
  memberships?: {
    id: string;
    role: string;
    organization: {
      id: string;
      name: string;
    };
  }[];
}

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  const { selectedOrganization } = useOrganization();
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen && selectedOrganization) {
      fetchPaymentSummary(user.id);
    }
  }, [user, isOpen, selectedOrganization]);

  const fetchPaymentSummary = async (userId: string) => {
    if (!selectedOrganization) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/users/payment-summary?organizationId=${selectedOrganization.id}&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentSummary(data);
      } else {
        console.error('Failed to fetch payment summary');
        setPaymentSummary(null);
      }
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      setPaymentSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Detail User</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama</label>
              <p className="text-gray-900">{user.name || 'Tidak ada nama'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nomor Telepon</label>
              <p className="text-gray-900">{user.phoneNumber || 'Tidak ada nomor telepon'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status Email</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                user.emailVerified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.emailVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bergabung</label>
              <p className="text-gray-900">{new Date(user.createdAt).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role dalam Organisasi</label>
            <div className="space-y-2">
              {user.memberships && user.memberships.length > 0 ? (
                user.memberships.map((membership) => (
                  <div key={membership.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{membership.organization.name}</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(membership.role)}`}>
                      {getRoleLabel(membership.role)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Tidak ada role dalam organisasi</p>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ringkasan Pembayaran</label>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : paymentSummary ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Total Sudah Dibayar</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(paymentSummary.paidAmount)}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">{paymentSummary.paidDues} tagihan lunas</p>
                </div>
                
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-800">Total Belum Dibayar</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(paymentSummary.unpaidAmount)}</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">{paymentSummary.unpaidDues} tagihan belum lunas</p>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Total Tagihan</span>
                    <span className="text-lg font-bold text-blue-600">{paymentSummary.totalDues}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Keseluruhan tagihan yang pernah dibuat</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Tidak ada data pembayaran</p>
            )}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, isOpen, onClose, onUserUpdated }: EditUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email);
      setPhoneError("");
      
      // Parse existing phone number
      if (user.phoneNumber) {
        // Extract country code and number
        const phoneMatch = user.phoneNumber.match(/^(\+\d{1,4})(\d+)$/);
        if (phoneMatch) {
          setCountryCode(phoneMatch[1]);
          setPhoneNumber(phoneMatch[2]);
        } else {
          setPhoneNumber(user.phoneNumber);
        }
      } else {
        setPhoneNumber("");
        setCountryCode("+62");
      }
    }
  }, [user]);

  const formatPhoneNumber = (phone: string, code: string) => {
    if (!phone) return null;
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    
    // Format with country code
    return code + digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate phone number if provided
    if (phoneNumber) {
      const phoneValidation = validatePhoneNumber(phoneNumber, countryCode);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error || 'Format nomor telepon tidak valid');
        return;
      }
      setPhoneError('');
    } else {
      setPhoneError('');
    }

    setLoading(true);
    try {
      const phoneValidation = phoneNumber ? validatePhoneNumber(phoneNumber, countryCode) : { formatted: null };
      const formattedPhone = phoneValidation.formatted;
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          phoneNumber: formattedPhone,
        }),
      });

      if (response.ok) {
        alert('User berhasil diperbarui!');
        onUserUpdated();
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Gagal memperbarui user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Gagal memperbarui user: Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan nama user"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan email user"
              required
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Telepon
            </label>
            <div className="flex">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              >
                <option value="+62">🇮🇩 +62</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+60">🇲🇾 +60</option>
              </select>
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="858xxxxxxxx"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Contoh: 858xxxxxxxx (tanpa 0 di depan)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getRoleColor(role: string) {
  switch (role) {
    case 'ADMIN': return 'bg-red-100 text-red-800';
    case 'TREASURER': return 'bg-blue-100 text-blue-800';
    case 'VIEWER': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'ADMIN': return 'Admin';
    case 'TREASURER': return 'Bendahara';
    case 'VIEWER': return 'Viewer';
    default: return role;
  }
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { selectedOrganization, loading: orgLoading } = useOrganization();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (selectedOrganization && !orgLoading) {
      fetchUsers();
    }
  }, [selectedOrganization, orgLoading]);

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

  const fetchUsers = async () => {
    if (!selectedOrganization) return;
    
    try {
      const response = await fetch(`/api/users?organizationId=${selectedOrganization.id}`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (confirm(`Apakah Anda yakin ingin menghapus user ${user.name || user.email}?`)) {
      try {
        const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
        
        if (response.ok) {
          alert('User berhasil dihapus');
          fetchUsers(); // Refresh the list
        } else {
          const errorData = await response.json();
          if (response.status === 404) {
            alert('User tidak ditemukan atau sudah dihapus sebelumnya');
            fetchUsers(); // Refresh the list anyway to update UI
          } else if (response.status === 403) {
            alert('Anda tidak memiliki izin untuk menghapus user ini');
          } else {
            alert(`Gagal menghapus user: ${errorData.error || 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Gagal menghapus user: Network error');
      }
    }
  };

  const handleResendVerification = async (user: User) => {
    if (confirm(`Kirim ulang email verifikasi ke ${user.email}?`)) {
      try {
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            userId: user.id
          }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          alert('Email verifikasi berhasil dikirim ulang!');
        } else {
          alert(`Gagal mengirim email: ${data.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error resending verification:', error);
        alert('Gagal mengirim email: Network error');
      }
    }
  };

  if (loading || orgLoading || !selectedOrganization) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="text-center py-4">
          {orgLoading ? 'Loading organizations...' : 
           !selectedOrganization ? 'Please select an organization' : 
           'Loading users...'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => setIsCreateUserModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>👤</span>
            <span>Tambah User</span>
          </button>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>📧</span>
            <span>Undang User</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama/Email
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Verified
                </th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bergabung
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || 'Tidak ada nama'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {/* Show role on mobile */}
                      <div className="md:hidden mt-1">
                        {user.memberships && user.memberships.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.memberships[0].role)}`}>
                              {getRoleLabel(user.memberships[0].role)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No role</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.emailVerified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    {user.memberships && user.memberships.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.memberships[0].role)}`}>
                          {getRoleLabel(user.memberships[0].role)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No role</span>
                    )}
                  </td>
                  
                  <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <button
                        onClick={() => handleView(user)}
                        className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200"
                      >
                        <svg className="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-300 focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 transition-all duration-200"
                      >
                        <svg className="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      {!user.emailVerified && (
                        <button
                          onClick={() => handleResendVerification(user)}
                          className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-all duration-200"
                          title="Kirim ulang email verifikasi"
                        >
                          <svg className="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="hidden sm:inline">Kirim Ulang</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user)}
                        className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200"
                      >
                        <svg className="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Tidak ada user yang ditemukan
          </div>
        )}
      </div>

      <UserDetailModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      
      <EditUserModal
        user={selectedUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUserUpdated={fetchUsers}
      />
      
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        organizationName={selectedOrganization?.name || ""}
        organizationId={selectedOrganization?.id || ""}
        onUserCreated={fetchUsers}
      />
      
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        organizationName={selectedOrganization?.name || ""}
        organizationId={selectedOrganization?.id || ""}
        onInviteSent={fetchUsers}
      />
    </div>
  );
}