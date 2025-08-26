'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface ImportResult {
  success: number;
  duplicates: number;
  errors: number;
  errorDetails?: string[];
}

interface ImportMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess: () => void;
}

export default function ImportMemberModal({
  isOpen,
  onClose,
  organizationId,
  onSuccess,
}: ImportMemberModalProps) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setError('File harus memiliki minimal header dan 1 baris data');
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const requiredHeaders = ['fullName', 'email'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setError(`Header yang diperlukan tidak ditemukan: ${missingHeaders.join(', ')}`);
        setLoading(false);
        return;
      }

      const parsedMembers = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const member: any = {};
        
        headers.forEach((header, index) => {
          member[header] = values[index] || '';
        });

        // Validate required fields
        if (!member.fullName || !member.email) {
          continue; // Skip invalid rows
        }

        // Set default values
        member.joinDate = member.joinDate || new Date().toISOString().split('T')[0];
        member.phone = member.phone || '';
        member.address = member.address || '';
        
        parsedMembers.push(member);
      }

      if (parsedMembers.length === 0) {
        setError('Tidak ada data member yang valid ditemukan');
        setLoading(false);
        return;
      }

      setMembers(parsedMembers);
      setStep('preview');
    } catch (error) {
      setError('Gagal membaca file. Pastikan file dalam format CSV yang benar.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');

    try {
      const response = await fetch('/api/members/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          members,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        setStep('result');
        if (result.success > 0) {
          onSuccess();
        }
      } else {
        setError(result.error || 'Gagal mengimpor member');
      }
    } catch (error) {
      setError('Terjadi kesalahan saat mengimpor member');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setMembers([]);
    setError('');
    setImportResult(null);
    setStep('upload');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = 'fullName,email,phone,address,joinDate\n"John Doe","john@example.com","081234567890","Jl. Contoh No. 123","2024-01-15"';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_member.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Import Members</h2>
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

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Format File CSV</h3>
              <p className="text-sm text-blue-700 mb-2">
                File harus dalam format CSV dengan header berikut:
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li><strong>fullName</strong> (wajib): Nama lengkap member</li>
                <li><strong>email</strong> (wajib): Email member</li>
                <li><strong>phone</strong> (opsional): Nomor telepon</li>
                <li><strong>address</strong> (opsional): Alamat</li>
                <li><strong>joinDate</strong> (opsional): Tanggal bergabung (YYYY-MM-DD)</li>
              </ul>
              <button
                onClick={downloadTemplate}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Download Template CSV
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih File CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600">Memproses file...</p>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Preview Data ({members.length} members)</h3>
              <button
                onClick={() => setStep('upload')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Kembali
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Bergabung</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{member.fullName}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{member.email}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{member.phone || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{member.joinDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Mengimpor...' : `Import ${members.length} Members`}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-green-600">Hasil Import</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-green-700">Berhasil</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</div>
                <div className="text-sm text-yellow-700">Duplikat</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                <div className="text-sm text-red-700">Error</div>
              </div>
            </div>

            {importResult.errorDetails && importResult.errorDetails.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">Detail Error:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {importResult.errorDetails.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Import Lagi
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}