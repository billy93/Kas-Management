"use client";
import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useNotifications } from '@/hooks/useNotifications';

interface DataExporterProps {
  className?: string;
}

type ExportType = 'payments' | 'transactions' | 'members' | 'dues';

export default function DataExporter({ className = '' }: DataExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    type: 'payments' as ExportType,
    startDate: '',
    endDate: '',
    includeDetails: true
  });
  const { selectedOrganization } = useOrganization();
  const { sendNotification } = useNotifications();

  const exportTypes = [
    { value: 'payments', label: 'Data Pembayaran', icon: '💰' },
    { value: 'transactions', label: 'Data Transaksi', icon: '📊' },
    { value: 'members', label: 'Data Anggota', icon: '👤' },
    { value: 'dues', label: 'Data Iuran', icon: '📋' }
  ];

  const handleExport = async () => {
    if (!selectedOrganization) return;
    
    setIsExporting(true);
    
    try {
      const params = new URLSearchParams({
        organizationId: selectedOrganization.id,
        type: exportConfig.type,
        ...(exportConfig.startDate && { startDate: exportConfig.startDate }),
        ...(exportConfig.endDate && { endDate: exportConfig.endDate }),
        includeDetails: exportConfig.includeDetails.toString()
      });
      
      const response = await fetch(`/api/export?${params}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Gagal mengekspor data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const dateRange = exportConfig.startDate && exportConfig.endDate 
        ? `_${exportConfig.startDate}_to_${exportConfig.endDate}`
        : `_${new Date().toISOString().split('T')[0]}`;
      
      a.download = `${exportConfig.type}-${selectedOrganization.name}${dateRange}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      await sendNotification('system', `Data ${exportConfig.type} berhasil diekspor`);
    } catch (error) {
      console.error('Error exporting data:', error);
      await sendNotification('system', 'Gagal mengekspor data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setExportConfig(prev => ({ ...prev, [key]: value }));
  };

  const getExportDescription = (type: ExportType) => {
    switch (type) {
      case 'payments':
        return 'Ekspor data pembayaran termasuk tanggal, jumlah, metode pembayaran, dan status.';
      case 'transactions':
        return 'Ekspor data transaksi keuangan termasuk pemasukan, pengeluaran, dan saldo.';
      case 'members':
        return 'Ekspor data anggota termasuk informasi pribadi, tanggal bergabung, dan status.';
      case 'dues':
        return 'Ekspor data iuran termasuk periode, jumlah, dan status pembayaran.';
      default:
        return '';
    }
  };

  if (!selectedOrganization) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        Pilih organisasi untuk mengekspor data
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Ekspor Data</h2>
        <p className="text-sm text-gray-600 mt-1">
          Ekspor data organisasi ke format CSV untuk analisis atau backup
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Export Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pilih Jenis Data
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exportTypes.map((type) => (
              <label
                key={type.value}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  exportConfig.type === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value={type.value}
                  checked={exportConfig.type === type.value}
                  onChange={(e) => handleConfigChange('type', e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{type.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getExportDescription(type.value as ExportType)}
                    </div>
                  </div>
                </div>
                {exportConfig.type === type.value && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Date Range Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Rentang Tanggal (Opsional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={exportConfig.startDate}
                onChange={(e) => handleConfigChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={exportConfig.endDate}
                onChange={(e) => handleConfigChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Kosongkan untuk mengekspor semua data
          </p>
        </div>

        {/* Export Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Opsi Ekspor
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportConfig.includeDetails}
                onChange={(e) => handleConfigChange('includeDetails', e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Sertakan detail lengkap (relasi dan metadata)
              </span>
            </label>
          </div>
        </div>

        {/* Export Preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Preview Ekspor</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Jenis Data:</strong> {exportTypes.find(t => t.value === exportConfig.type)?.label}</p>
            <p><strong>Organisasi:</strong> {selectedOrganization.name}</p>
            <p><strong>Rentang Tanggal:</strong> {
              exportConfig.startDate && exportConfig.endDate
                ? `${exportConfig.startDate} sampai ${exportConfig.endDate}`
                : 'Semua data'
            }</p>
            <p><strong>Format:</strong> CSV</p>
            <p><strong>Detail Lengkap:</strong> {exportConfig.includeDetails ? 'Ya' : 'Tidak'}</p>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mengekspor...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ekspor Data
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Informasi Ekspor</h4>
              <div className="text-sm text-blue-700 mt-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Data akan diekspor dalam format CSV yang kompatibel dengan Excel</li>
                  <li>File akan otomatis terunduh setelah proses ekspor selesai</li>
                  <li>Ekspor dengan detail lengkap akan menyertakan informasi relasi</li>
                  <li>Semua ekspor akan tercatat dalam audit log</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}