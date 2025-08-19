"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useOrganization } from '@/contexts/OrganizationContext';
import AuditLogViewer from '@/components/AuditLogViewer';
import BackupManager from '@/components/BackupManager';
import DataExporter from '@/components/DataExporter';
import NotificationCenter from '@/components/NotificationCenter';

type AdminTab = 'audit' | 'backup' | 'export' | 'notifications';

export default function AdminPage() {
  const { data: session } = useSession();
  const { selectedOrganization, userRole, loading } = useOrganization();
  const [activeTab, setActiveTab] = useState<AdminTab>('audit');

  const tabs = [
    {
      id: 'audit' as AdminTab,
      name: 'Audit Logs',
      icon: '📋',
      description: 'Riwayat aktivitas pengguna'
    },
    {
      id: 'backup' as AdminTab,
      name: 'Backup & Restore',
      icon: '💾',
      description: 'Kelola backup data'
    },
    {
      id: 'export' as AdminTab,
      name: 'Ekspor Data',
      icon: '📤',
      description: 'Ekspor data ke CSV'
    },
    {
      id: 'notifications' as AdminTab,
      name: 'Notifikasi',
      icon: '🔔',
      description: 'Pengaturan notifikasi'
    }
  ];

  // Check if user has admin role
  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
          <p className="text-gray-600">Silakan login untuk mengakses halaman admin.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
          <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman admin.</p>
          <p className="text-sm text-gray-500 mt-2">Role Anda: {userRole || 'Tidak diketahui'}</p>
        </div>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pilih Organisasi</h1>
          <p className="text-gray-600">Silakan pilih organisasi untuk mengakses panel admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel Admin</h1>
              <p className="text-gray-600 mt-1">
                Kelola sistem untuk {selectedOrganization.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <div className="text-sm text-gray-500">
                {session.user?.name || session.user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow">
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu Admin</h2>
                <ul className="space-y-2">
                  {tabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-lg mr-3">{tab.icon}</span>
                          <div>
                            <div className="font-medium">{tab.name}</div>
                            <div className="text-xs text-gray-500">{tab.description}</div>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow mt-6 p-4">
              <h3 className="text-md font-semibold text-gray-900 mb-3">Info Sistem</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Organisasi:</span>
                  <span className="font-medium">{selectedOrganization.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium">{userRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-medium">Aktif</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'audit' && (
              <AuditLogViewer className="" />
            )}
            
            {activeTab === 'backup' && (
              <BackupManager className="" />
            )}
            
            {activeTab === 'export' && (
              <DataExporter className="" />
            )}
            
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Pengaturan Notifikasi</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Kelola pengaturan notifikasi sistem
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Real-time Notifications */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-md font-medium text-gray-900 mb-2">Notifikasi Real-time</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Sistem notifikasi real-time menggunakan Server-Sent Events (SSE) telah aktif.
                        Notifikasi akan muncul secara otomatis untuk:
                      </p>
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        <li>Pembayaran baru</li>
                        <li>Anggota baru bergabung</li>
                        <li>Transaksi keuangan</li>
                        <li>Pengingat iuran</li>
                        <li>Aktivitas sistem</li>
                      </ul>
                    </div>

                    {/* Email Notifications */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-md font-medium text-gray-900 mb-2">Notifikasi Email</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Pengingat email bulanan sudah dikonfigurasi melalui Vercel Cron.
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-green-800">Cron job aktif - Pengingat bulanan berjalan otomatis</span>
                        </div>
                      </div>
                    </div>

                    {/* Browser Notifications */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-md font-medium text-gray-900 mb-2">Notifikasi Browser</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Izinkan notifikasi browser untuk mendapatkan pemberitahuan desktop.
                      </p>
                      <button
                        onClick={() => {
                          if ('Notification' in window) {
                            Notification.requestPermission().then(permission => {
                              if (permission === 'granted') {
                                new Notification('Notifikasi browser aktif!', {
                                  icon: '/favicon.ico'
                                });
                              }
                            });
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Aktifkan Notifikasi Browser
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}