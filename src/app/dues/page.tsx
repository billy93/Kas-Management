"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/utils";

interface Member {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

interface DuesStatus {
  memberId: string;
  member: Member;
  year: number;
  monthlyStatus: {
    [month: number]: {
      status: 'PAID' | 'PARTIAL' | 'PENDING';
      duesAmount: number;
      totalPaid: number;
      remainingAmount: number;
      duesId?: string;
    };
  };
}

interface PaymentForm {
  duesId: string;
  memberName: string;
  amount: number;
  method: string;
  note: string;
  month: number;
  year: number;
}

interface BulkPaymentForm {
  memberId: string;
  memberName: string;
  selectedMonths: number[];
  totalAmount: number;
  method: string;
  note: string;
  year: number;
}

export default function DuesPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [duesStatuses, setDuesStatuses] = useState<DuesStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    duesId: '',
    memberName: '',
    amount: 0,
    method: 'CASH',
    note: '',
    month: 1,
    year: new Date().getFullYear()
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showBulkPaymentForm, setShowBulkPaymentForm] = useState(false);
  const [bulkPaymentForm, setBulkPaymentForm] = useState<BulkPaymentForm>({
    memberId: '',
    memberName: '',
    selectedMonths: [],
    totalAmount: 0,
    method: 'CASH',
    note: '',
    year: new Date().getFullYear()
  });

  const months = [
    { value: 1, label: 'Jan', fullLabel: 'Januari' },
    { value: 2, label: 'Feb', fullLabel: 'Februari' },
    { value: 3, label: 'Mar', fullLabel: 'Maret' },
    { value: 4, label: 'Apr', fullLabel: 'April' },
    { value: 5, label: 'Mei', fullLabel: 'Mei' },
    { value: 6, label: 'Jun', fullLabel: 'Juni' },
    { value: 7, label: 'Jul', fullLabel: 'Juli' },
    { value: 8, label: 'Agu', fullLabel: 'Agustus' },
    { value: 9, label: 'Sep', fullLabel: 'September' },
    { value: 10, label: 'Okt', fullLabel: 'Oktober' },
    { value: 11, label: 'Nov', fullLabel: 'November' },
    { value: 12, label: 'Des', fullLabel: 'Desember' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    fetchDuesStatuses();
  }, [selectedYear]);

  const fetchDuesStatuses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dues/yearly-status?year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setDuesStatuses(data);
      }
    } catch (error) {
      console.error('Error fetching dues statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500 hover:bg-green-600';
      case 'PARTIAL':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'PENDING':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-300 hover:bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Lunas';
      case 'PARTIAL':
        return 'Sebagian';
      case 'PENDING':
        return 'Belum Bayar';
      default:
        return 'Tidak Ada Data';
    }
  };

  const handleCellClick = async (member: DuesStatus, month: number) => {
    const monthStatus = member.monthlyStatus[month];
    
    // If no dues exists (gray cell), create new dues
    if (!monthStatus) {
      await createDues(member.memberId, month);
      return;
    }
    
    // If dues exists with partial payment, allow both payment and deletion
     if (monthStatus.status === 'PARTIAL') {
       const action = window.confirm(
         `Tagihan ${months.find(m => m.value === month)?.fullLabel} ${selectedYear} untuk ${member.member.fullName} sudah dibayar sebagian.\n\nKlik OK untuk melanjutkan pembayaran, atau Cancel untuk menghapus tagihan.`
       );
       if (action) {
         // Continue payment
         setPaymentForm({
           duesId: monthStatus.duesId || '',
           memberName: member.member.fullName,
           amount: monthStatus.remainingAmount,
           method: 'CASH',
           note: '',
           month,
           year: selectedYear
         });
         setShowPaymentForm(true);
       } else {
         // Delete dues
         await deleteDues(monthStatus.duesId!);
       }
       return;
     }
     
     // If dues exists but no payments (red cell), allow both payment and deletion
      if (monthStatus.status === 'PENDING') {
        const action = window.confirm(
          `Tagihan ${months.find(m => m.value === month)?.fullLabel} ${selectedYear} untuk ${member.member.fullName} belum dibayar.\n\nKlik OK untuk melakukan pembayaran, atau Cancel untuk menghapus tagihan.`
        );
        if (action) {
          // Make payment
          setPaymentForm({
            duesId: monthStatus.duesId || '',
            memberName: member.member.fullName,
            amount: monthStatus.remainingAmount,
            method: 'CASH',
            note: '',
            month,
            year: selectedYear
          });
          setShowPaymentForm(true);
        } else {
          // Delete dues
          await deleteDues(monthStatus.duesId!);
        }
        return;
      }
    
    // If fully paid (green cell), delete payments to make it red
    if (monthStatus.status === 'PAID') {
      const confirmDelete = window.confirm(
        `Apakah Anda yakin ingin menghapus pembayaran ${months.find(m => m.value === month)?.fullLabel} ${selectedYear} untuk ${member.member.fullName}?\n\nTagihan akan kembali menjadi belum dibayar (merah).`
      );
      if (confirmDelete) {
        await deletePayments(monthStatus.duesId!);
      }
    }
  };
  
  const createDues = async (memberId: string, month: number) => {
    try {
      // Get dues config to determine amount
      const configResponse = await fetch('/api/dues-config');
      let duesAmount = 50000; // default amount
      
      if (configResponse.ok) {
        const configData = await configResponse.json();
        duesAmount = configData.duesConfig?.amount || 50000;
      }
      
      const response = await fetch('/api/dues', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           month,
           year: selectedYear,
           amount: duesAmount,
           memberId
         }),
       });
      
      if (response.ok) {
        fetchDuesStatuses(); // Refresh data
        alert(`Tagihan ${months.find(m => m.value === month)?.fullLabel} ${selectedYear} berhasil dibuat!`);
      } else {
        alert('Gagal membuat tagihan');
      }
    } catch (error) {
      console.error('Error creating dues:', error);
      alert('Terjadi kesalahan saat membuat tagihan');
    }
  };
  
  const deletePayments = async (duesId: string) => {
     try {
       const response = await fetch(`/api/payments/dues/${duesId}`, {
         method: 'DELETE',
       });
       
       if (response.ok) {
         fetchDuesStatuses(); // Refresh data
         alert('Pembayaran berhasil dihapus!');
       } else {
         const errorData = await response.json();
         alert(errorData.error || 'Gagal menghapus pembayaran');
       }
     } catch (error) {
       console.error('Error deleting payments:', error);
       alert('Terjadi kesalahan saat menghapus pembayaran');
     }
   };
   
   const deleteDues = async (duesId: string) => {
     try {
       const response = await fetch(`/api/dues/${duesId}`, {
         method: 'DELETE',
       });
       
       if (response.ok) {
         fetchDuesStatuses(); // Refresh data
         alert('Tagihan berhasil dihapus!');
       } else {
         const errorData = await response.json();
         alert(errorData.error || 'Gagal menghapus tagihan');
       }
     } catch (error) {
       console.error('Error deleting dues:', error);
       alert('Terjadi kesalahan saat menghapus tagihan');
     }
   };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duesId: paymentForm.duesId,
          amount: paymentForm.amount,
          method: paymentForm.method,
          note: paymentForm.note,
        }),
      });

      if (response.ok) {
        setShowPaymentForm(false);
        fetchDuesStatuses(); // Refresh data
        alert('Pembayaran berhasil dicatat!');
      } else {
        alert('Gagal mencatat pembayaran');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Terjadi kesalahan saat mencatat pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkPaymentClick = (member: DuesStatus) => {
    const unpaidMonths = months.filter(month => {
      const monthStatus = member.monthlyStatus[month.value];
      return monthStatus && monthStatus.status !== 'PAID';
    });

    const totalAmount = unpaidMonths.reduce((sum, month) => {
      const monthStatus = member.monthlyStatus[month.value];
      return sum + (monthStatus?.remainingAmount || 0);
    }, 0);

    setBulkPaymentForm({
      memberId: member.memberId,
      memberName: member.member.fullName,
      selectedMonths: unpaidMonths.map(m => m.value),
      totalAmount,
      method: 'CASH',
      note: '',
      year: selectedYear
    });
    setShowBulkPaymentForm(true);
  };

  const handleMonthToggle = (month: number, member: DuesStatus) => {
    const monthStatus = member.monthlyStatus[month];
    if (!monthStatus || monthStatus.status === 'PAID') return;

    const isSelected = bulkPaymentForm.selectedMonths.includes(month);
    let newSelectedMonths;
    let newTotalAmount = bulkPaymentForm.totalAmount;

    if (isSelected) {
      newSelectedMonths = bulkPaymentForm.selectedMonths.filter(m => m !== month);
      newTotalAmount -= monthStatus.remainingAmount;
    } else {
      newSelectedMonths = [...bulkPaymentForm.selectedMonths, month];
      newTotalAmount += monthStatus.remainingAmount;
    }

    setBulkPaymentForm({
      ...bulkPaymentForm,
      selectedMonths: newSelectedMonths,
      totalAmount: newTotalAmount
    });
  };

  const submitBulkPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Submit payment for each selected month
      const paymentPromises = bulkPaymentForm.selectedMonths.map(async (month) => {
        const member = duesStatuses.find(m => m.memberId === bulkPaymentForm.memberId);
        const monthStatus = member?.monthlyStatus[month];
        
        if (!monthStatus?.duesId) return;

        return fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            duesId: monthStatus.duesId,
            amount: monthStatus.remainingAmount,
            method: bulkPaymentForm.method,
            note: `${bulkPaymentForm.note} (Pembayaran sekaligus untuk ${months.find(m => m.value === month)?.fullLabel})`,
          }),
        });
      });

      const results = await Promise.all(paymentPromises);
      const allSuccessful = results.every(response => response?.ok);

      if (allSuccessful) {
        setShowBulkPaymentForm(false);
        fetchDuesStatuses(); // Refresh data
        alert(`Pembayaran sekaligus berhasil dicatat untuk ${bulkPaymentForm.selectedMonths.length} bulan!`);
      } else {
        alert('Beberapa pembayaran gagal dicatat');
      }
    } catch (error) {
      console.error('Error submitting bulk payment:', error);
      alert('Terjadi kesalahan saat mencatat pembayaran sekaligus');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateYearlyStats = () => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalPartial = 0;

    duesStatuses.forEach(member => {
      Object.values(member.monthlyStatus).forEach(monthStatus => {
        if (monthStatus.status === 'PAID') totalPaid++;
        else if (monthStatus.status === 'PARTIAL') totalPartial++;
        else if (monthStatus.status === 'PENDING') totalPending++;
      });
    });

    return { totalPaid, totalPending, totalPartial };
  };

  const stats = calculateYearlyStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Manajemen Iuran</h1>
        <p className="text-gray-600">Pantau status pembayaran iuran anggota sepanjang tahun</p>
      </div>

      {/* Year Selector and Stats */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-4">
          <div className="bg-green-100 border border-green-200 rounded-lg px-4 py-2">
            <div className="text-green-800 text-sm font-medium">Lunas</div>
            <div className="text-green-900 text-xl font-bold">{stats.totalPaid}</div>
          </div>
          <div className="bg-yellow-100 border border-yellow-200 rounded-lg px-4 py-2">
            <div className="text-yellow-800 text-sm font-medium">Sebagian</div>
            <div className="text-yellow-900 text-xl font-bold">{stats.totalPartial}</div>
          </div>
          <div className="bg-red-100 border border-red-200 rounded-lg px-4 py-2">
            <div className="text-red-800 text-sm font-medium">Belum Bayar</div>
            <div className="text-red-900 text-xl font-bold">{stats.totalPending}</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Keterangan:</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Lunas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-600">Sebagian</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Belum Bayar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span className="text-sm text-gray-600">Tidak Ada Data</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Klik pada kotak merah atau kuning untuk mencatat pembayaran</p>
      </div>

      {/* Main Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Memuat data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Nama Anggota
                  </th>
                  {months.map(month => (
                    <th key={month.value} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                      {month.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {duesStatuses.map((member) => {
                  const hasUnpaidDues = months.some(month => {
                    const monthStatus = member.monthlyStatus[month.value];
                    return monthStatus && monthStatus.status !== 'PAID';
                  });
                  
                  return (
                    <tr key={member.memberId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="text-sm font-medium text-gray-900">{member.member.fullName}</div>
                        <div className="text-xs text-gray-500">{member.member.email}</div>
                      </td>
                      {months.map(month => {
                        const monthStatus = member.monthlyStatus[month.value];
                        const status = monthStatus?.status || 'NO_DATA';
                        
                        return (
                          <td key={month.value} className="px-2 py-4 text-center">
                            <button
                              onClick={() => handleCellClick(member, month.value)}
                              className={`w-12 h-12 rounded-lg text-white text-xs font-medium transition-colors cursor-pointer ${
                                getStatusColor(status)
                              }`}
                              title={`${month.fullLabel}: ${getStatusText(status)}${monthStatus ? ` - ${money(monthStatus.remainingAmount)} tersisa` : ''}`}
                            >
                              {status === 'PAID' ? '✓' : status === 'PARTIAL' ? '½' : status === 'PENDING' ? '✗' : '-'}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-center">
                        {hasUnpaidDues && (
                          <button
                            onClick={() => handleBulkPaymentClick(member)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            title="Bayar beberapa bulan sekaligus"
                          >
                            Bayar Sekaligus
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Catat Pembayaran - {months.find(m => m.value === paymentForm.month)?.fullLabel} {paymentForm.year}
            </h3>
            
            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Anggota</label>
                <input
                  type="text"
                  value={paymentForm.memberName}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pembayaran</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="E_WALLET">E-Wallet</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                <textarea
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({...paymentForm, note: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Catatan tambahan..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Payment Form Modal */}
      {showBulkPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Pembayaran Sekaligus - {bulkPaymentForm.memberName}
            </h3>
            
            <form onSubmit={submitBulkPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Bulan yang Akan Dibayar</label>
                <div className="grid grid-cols-3 gap-2">
                  {months.map(month => {
                    const member = duesStatuses.find(m => m.memberId === bulkPaymentForm.memberId);
                    const monthStatus = member?.monthlyStatus[month.value];
                    const isAvailable = monthStatus && monthStatus.status !== 'PAID';
                    const isSelected = bulkPaymentForm.selectedMonths.includes(month.value);
                    
                    return (
                      <button
                        key={month.value}
                        type="button"
                        onClick={() => member && handleMonthToggle(month.value, member)}
                        disabled={!isAvailable}
                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                          !isAvailable
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div>{month.fullLabel}</div>
                        {monthStatus && (
                          <div className="text-xs mt-1">
                            {money(monthStatus.remainingAmount)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Bulan yang sudah lunas tidak dapat dipilih. Klik bulan untuk memilih/membatalkan.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total Bulan Dipilih: {bulkPaymentForm.selectedMonths.length}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    Total: {money(bulkPaymentForm.totalAmount)}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                <select
                  value={bulkPaymentForm.method}
                  onChange={(e) => setBulkPaymentForm({...bulkPaymentForm, method: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="E_WALLET">E-Wallet</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                <textarea
                  value={bulkPaymentForm.note}
                  onChange={(e) => setBulkPaymentForm({...bulkPaymentForm, note: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Catatan untuk pembayaran sekaligus..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkPaymentForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || bulkPaymentForm.selectedMonths.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : `Bayar ${bulkPaymentForm.selectedMonths.length} Bulan`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}