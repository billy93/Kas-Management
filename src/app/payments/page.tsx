"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/utils";

interface Member {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

interface UnpaidMember {
  member: Member;
  duesAmount: number;
  totalPaid: number;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  duesId: string;
  year: number;
  month: number;
}

interface MultiMonthPayment {
  duesId: string;
  year: number;
  month: number;
  amount: number;
}

interface PaymentForm {
  duesId: string;
  memberName: string;
  amount: number;
  method: string;
  note: string;
  isMultiMonth: boolean;
  monthCount: number;
  multiMonthPayments: MultiMonthPayment[];
}

export default function PaymentsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [unpaidMembers, setUnpaidMembers] = useState<UnpaidMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    duesId: '',
    memberName: '',
    amount: 0,
    method: 'CASH',
    note: '',
    isMultiMonth: false,
    monthCount: 1,
    multiMonthPayments: []
  });
  const [submitting, setSubmitting] = useState(false);

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    fetchUnpaidMembers();
  }, [selectedYear, selectedMonth]);

  const fetchUnpaidMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dues/unpaid?year=${selectedYear}&month=${selectedMonth}`);
      if (response.ok) {
        const data = await response.json();
        setUnpaidMembers(data);
      }
    } catch (error) {
      console.error('Error fetching unpaid members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberOutstandingDues = async (memberId: string) => {
    try {
      const response = await fetch(`/api/dues/outstanding/${memberId}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching outstanding dues:', error);
    }
    return [];
  };

  const handlePayment = async (member: UnpaidMember) => {
    const outstandingDues = await fetchMemberOutstandingDues(member.member.id);
    
    // Sort outstanding dues by year and month (oldest first)
    const sortedDues = outstandingDues.sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    
    const multiMonthPayments = sortedDues.map((dues: any) => ({
      duesId: dues.id,
      year: dues.year,
      month: dues.month,
      amount: dues.remainingAmount
    }));
    
    setPaymentForm({
      duesId: member.duesId,
      memberName: member.member.fullName,
      amount: multiMonthPayments[0]?.amount || member.remainingAmount,
      method: 'CASH',
      note: '',
      isMultiMonth: false,
      monthCount: 1,
      multiMonthPayments
    });
    setShowPaymentForm(true);
  };

  const calculateMultiMonthTotal = () => {
    if (!paymentForm.isMultiMonth) return paymentForm.amount;
    
    return paymentForm.multiMonthPayments
      .slice(0, paymentForm.monthCount)
      .reduce((total, payment) => total + payment.amount, 0);
  };

  const handleMultiMonthToggle = () => {
    const isMultiMonth = !paymentForm.isMultiMonth;
    let newAmount;
    
    if (isMultiMonth) {
      // Calculate total for selected months when enabling multi-month
      newAmount = paymentForm.multiMonthPayments
        .slice(0, paymentForm.monthCount)
        .reduce((total, payment) => total + payment.amount, 0);
    } else {
      // Use only first month amount when disabling multi-month
      newAmount = paymentForm.multiMonthPayments[0]?.amount || 0;
    }
    
    setPaymentForm({
      ...paymentForm,
      isMultiMonth,
      amount: newAmount
    });
  };

  const handleMonthCountChange = (count: number) => {
    const validCount = Math.min(count, paymentForm.multiMonthPayments.length);
    const newAmount = paymentForm.multiMonthPayments
      .slice(0, validCount)
      .reduce((total, payment) => total + payment.amount, 0);
    
    setPaymentForm({
      ...paymentForm,
      monthCount: validCount,
      amount: newAmount
    });
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (paymentForm.isMultiMonth) {
        // Handle multi-month payment - process from oldest to newest
        const paymentsToProcess = paymentForm.multiMonthPayments
          .slice(0, paymentForm.monthCount)
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });
        
        let processedCount = 0;
        for (const payment of paymentsToProcess) {
          const monthName = months.find(m => m.value === payment.month)?.label;
          const response = await fetch('/api/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              duesId: payment.duesId,
              amount: payment.amount,
              method: paymentForm.method,
              note: paymentForm.note ? `${paymentForm.note} (${monthName} ${payment.year})` : `Pembayaran ${monthName} ${payment.year}`,
              createdById: 'current-user-id' // TODO: Get from session
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Gagal memproses pembayaran untuk ${monthName} ${payment.year}`);
          }
          processedCount++;
        }
        
        alert(`Pembayaran ${processedCount} bulan berhasil dicatat! (${paymentsToProcess.map(p => months.find(m => m.value === p.month)?.label + ' ' + p.year).join(', ')})`);
      } else {
        // Handle single month payment
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
            createdById: 'current-user-id' // TODO: Get from session
          }),
        });

        if (!response.ok) {
          throw new Error('Gagal mencatat pembayaran');
        }
        
        alert('Pembayaran berhasil dicatat!');
      }
      
      setShowPaymentForm(false);
      setPaymentForm({
        duesId: '',
        memberName: '',
        amount: 0,
        method: 'CASH',
        note: '',
        isMultiMonth: false,
        monthCount: 1,
        multiMonthPayments: []
      });
      fetchUnpaidMembers(); // Refresh data
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, remainingAmount: number) => {
    if (status === 'PAID') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Lunas</span>;
    } else if (status === 'PARTIAL') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Sebagian</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Belum Bayar</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">💳 Iuran & Pembayaran</h1>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {loading ? 'Memuat...' : `${unpaidMembers.length} anggota belum melunasi iuran`}
          </p>
        </div>
        
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Memuat data...</p>
          </div>
        ) : unpaidMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Anggota
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Kontak
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Jumlah Iuran
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Sudah Dibayar
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sisa Tagihan
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {unpaidMembers.map((item) => (
                  <tr key={item.member.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">{item.member.fullName}</div>
                      <div className="text-xs text-gray-500 md:hidden">{item.member.email}</div>
                      <div className="text-xs text-gray-500 sm:hidden">{money(item.duesAmount)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{item.member.email}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{item.member.phone}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{money(item.duesAmount)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{money(item.totalPaid)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-red-600">{money(item.remainingAmount)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      {getStatusBadge(item.status, item.remainingAmount)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      {item.status !== 'PAID' && (
                        <button
                          onClick={() => handlePayment(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium"
                        >
                          Bayar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <div className="text-lg">🎉</div>
            <p className="mt-2">Semua anggota sudah melunasi iuran untuk bulan ini!</p>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Catat Pembayaran</h3>
            
            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Anggota</label>
                <input
                  type="text"
                  value={paymentForm.memberName}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
              </div>
              
              <div>
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="multiMonth"
                    checked={paymentForm.isMultiMonth}
                    onChange={handleMultiMonthToggle}
                    className="mr-2"
                  />
                  <label htmlFor="multiMonth" className="text-sm font-medium text-gray-700">
                    Bayar beberapa bulan sekaligus
                  </label>
                </div>
                
                {paymentForm.isMultiMonth && paymentForm.multiMonthPayments.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jumlah bulan yang akan dibayar: {paymentForm.monthCount}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={paymentForm.multiMonthPayments.length}
                      value={paymentForm.monthCount}
                      onChange={(e) => handleMonthCountChange(Number(e.target.value))}
                      className="w-full mb-2"
                    />
                    <div className="text-xs text-gray-600">
                       <p>Tunggakan tersedia: {paymentForm.multiMonthPayments.length} bulan</p>
                       <p className="text-blue-600 font-medium mt-1">Pembayaran dimulai dari bulan terlama</p>
                       <div className="mt-2 max-h-32 overflow-y-auto border rounded p-2 bg-white">
                         {paymentForm.multiMonthPayments.slice(0, paymentForm.monthCount).map((payment, index) => (
                           <div key={index} className="flex justify-between text-xs py-1 border-b last:border-b-0">
                             <span className="font-medium">
                               {index + 1}. {months.find(m => m.value === payment.month)?.label} {payment.year}
                             </span>
                             <span className="text-green-600 font-medium">{money(payment.amount)}</span>
                           </div>
                         ))}
                         {paymentForm.multiMonthPayments.length > paymentForm.monthCount && (
                           <div className="text-xs text-gray-400 mt-1 italic">
                             +{paymentForm.multiMonthPayments.length - paymentForm.monthCount} bulan lainnya belum dipilih
                           </div>
                         )}
                       </div>
                     </div>
                  </div>
                )}
                
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {paymentForm.isMultiMonth ? 'Total Pembayaran' : 'Jumlah Pembayaran'}
                </label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => !paymentForm.isMultiMonth && setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${paymentForm.isMultiMonth ? 'bg-gray-100' : ''}`}
                  readOnly={paymentForm.isMultiMonth}
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
    </div>
  );
}