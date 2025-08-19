"use client";
import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useNotifications } from '@/hooks/useNotifications';

interface BackupManagerProps {
  className?: string;
}

export default function BackupManager({ className = '' }: BackupManagerProps) {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const { selectedOrganization } = useOrganization();
  const { sendNotification } = useNotifications();

  const createBackup = async () => {
    if (!selectedOrganization) return;
    
    setIsCreatingBackup(true);
    
    try {
      const response = await fetch(`/api/backup?organizationId=${selectedOrganization.id}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Gagal membuat backup');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `backup-${selectedOrganization.name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      await sendNotification('system', 'Backup berhasil dibuat dan diunduh');
    } catch (error) {
      console.error('Error creating backup:', error);
      await sendNotification('system', 'Gagal membuat backup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setRestoreFile(file);
    } else {
      alert('Silakan pilih file JSON yang valid');
    }
  };

  const restoreBackup = async () => {
    if (!selectedOrganization || !restoreFile) return;
    
    setIsRestoring(true);
    
    try {
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: selectedOrganization.id,
          data: backupData,
          mode: restoreMode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal melakukan restore');
      }
      
      const result = await response.json();
      await sendNotification('system', `Restore berhasil: ${result.message}`);
      setRestoreFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('restore-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error restoring backup:', error);
      await sendNotification('system', 'Gagal melakukan restore: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRestoring(false);
    }
  };

  if (!selectedOrganization) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        Pilih organisasi untuk mengelola backup
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Backup & Restore</h2>
        <p className="text-sm text-gray-600 mt-1">
          Kelola backup dan restore data organisasi
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Create Backup Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-md font-medium text-gray-900 mb-2">Buat Backup</h3>
          <p className="text-sm text-gray-600 mb-4">
            Unduh backup lengkap data organisasi dalam format JSON. Backup mencakup:
          </p>
          <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
            <li>Data anggota</li>
            <li>Konfigurasi iuran</li>
            <li>Riwayat iuran</li>
            <li>Data pembayaran</li>
            <li>Riwayat transaksi</li>
            <li>Pengaturan organisasi</li>
          </ul>
          <button
            onClick={createBackup}
            disabled={isCreatingBackup}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingBackup ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Membuat Backup...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Buat & Unduh Backup
              </>
            )}
          </button>
        </div>

        {/* Restore Backup Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-md font-medium text-gray-900 mb-2">Restore Backup</h3>
          <p className="text-sm text-gray-600 mb-4">
            Restore data dari file backup JSON. Pilih mode restore:
          </p>
          
          {/* Restore Mode Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode Restore
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  <strong>Merge:</strong> Gabungkan dengan data yang ada (lebih aman)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="restoreMode"
                  value="replace"
                  checked={restoreMode === 'replace'}
                  onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  <strong>Replace:</strong> Ganti semua data (HATI-HATI: akan menghapus data yang ada)
                </span>
              </label>
            </div>
          </div>
          
          {/* File Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih File Backup
            </label>
            <input
              id="restore-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          {restoreFile && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    File terpilih: {restoreFile.name}
                  </p>
                  <p className="text-xs text-yellow-700">
                    Mode: {restoreMode === 'merge' ? 'Merge (Gabung)' : 'Replace (Ganti)'}
                  </p>
                  {restoreMode === 'replace' && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      ⚠️ Mode Replace akan menghapus semua data yang ada!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={restoreBackup}
            disabled={!restoreFile || isRestoring}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRestoring ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Melakukan Restore...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Restore Data
              </>
            )}
          </button>
        </div>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800">Peringatan Penting</h4>
              <div className="text-sm text-red-700 mt-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Selalu buat backup sebelum melakukan restore</li>
                  <li>Mode "Replace" akan menghapus semua data yang ada</li>
                  <li>Pastikan file backup berasal dari sumber yang terpercaya</li>
                  <li>Proses restore tidak dapat dibatalkan</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}