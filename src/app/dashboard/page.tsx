"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { money } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { selectedOrganization, loading: orgLoading } = useOrganization();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/');
    }
  }, [status, router]);

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

  // Don't render dashboard if not authenticated
  if (!session) {
    return null;
  }
  const [financialData, setFinancialData] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    totalUnpaidAmount: 0,
    personalUnpaidAmount: 0,
    personalUnpaidMonths: 0
  });
  const [chartData, setChartData] = useState({
    monthlyData: [],
    categoryData: [],
    trendData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedOrganization && !orgLoading) {
      fetchDashboardData();
    }
  }, [selectedOrganization, orgLoading]);

  const fetchDashboardData = async () => {
    if (!selectedOrganization) return;
    
    try {
      // Fetch financial summary with organization ID
      const response = await fetch(`/api/dashboard/summary?organizationId=${selectedOrganization.id}`);
      const data = await response.json();
      
      setFinancialData({
        income: data.income || 0,
        expense: data.expense || 0,
        balance: data.balance || 0,
        totalUnpaidAmount: data.totalUnpaidAmount || 0,
        personalUnpaidAmount: data.personalUnpaidAmount || 0,
        personalUnpaidMonths: data.personalUnpaidMonths || 0
      });

      // Generate chart data from real transactions
      const transactions = data.monthlyTransactions || [];
      const monthlyData = generateMonthlyData(transactions);
      const categoryData = generateCategoryData(transactions);
      const trendData = generateTrendData(transactions, data.monthlyArrears);

      setChartData({
        monthlyData,
        categoryData,
        trendData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (transactions) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthNumber = index + 1;
      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.occurredAt);
        return txDate.getMonth() + 1 === monthNumber && txDate.getFullYear() === currentYear;
      });
      
      const pemasukan = monthTransactions
        .filter(tx => tx.type === 'INCOME')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const pengeluaran = monthTransactions
        .filter(tx => tx.type === 'EXPENSE')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      return {
        month,
        pemasukan,
        pengeluaran,
        saldo: pemasukan - pengeluaran
      };
    });
  };

  const generateCategoryData = (transactions) => {
    const expenseTransactions = transactions.filter(tx => tx.type === 'EXPENSE');
    const totalExpense = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    if (totalExpense === 0) {
      return [
        { name: 'Belum ada data', value: 100, amount: 0, color: '#e5e7eb' }
      ];
    }
    
    const categoryMap = {};
    expenseTransactions.forEach(tx => {
      const category = tx.category || 'Lain-lain';
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += tx.amount;
    });
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];
    
    return Object.entries(categoryMap).map(([name, amount], index) => ({
      name,
      value: Math.round((amount / totalExpense) * 100),
      amount,
      color: colors[index % colors.length]
    }));
  };

  const generateTrendData = (transactions, monthlyArrears) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    let cumulativeSaldo = 0;
    
    // Get last 6 months for trend display
    const last6Months = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentDate.getMonth() - i, 1);
      last6Months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        monthName: monthNames[date.getMonth()]
      });
    }
    
    return last6Months.map((monthData) => {
      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.occurredAt);
        return txDate.getMonth() + 1 === monthData.month && txDate.getFullYear() === monthData.year;
      });
      
      const monthIncome = monthTransactions
        .filter(tx => tx.type === 'INCOME')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const monthExpense = monthTransactions
        .filter(tx => tx.type === 'EXPENSE')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      cumulativeSaldo += (monthIncome - monthExpense);
      
      // Find corresponding arrears data
      const arrearsData = monthlyArrears?.find(arr => 
        arr.month === monthData.month && arr.year === monthData.year
      );
      
      return {
        month: monthData.monthName,
        saldo: Math.max(0, cumulativeSaldo),
        tunggakan: arrearsData?.unpaidAmount || 0
      };
    });
  };

  const { income, expense, balance, totalUnpaidAmount, personalUnpaidAmount, personalUnpaidMonths } = financialData;
  const { monthlyData, categoryData, trendData } = chartData;

  if (loading || orgLoading || !selectedOrganization) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Dashboard Kas</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">
            {orgLoading ? 'Loading organizations...' : 
             !selectedOrganization ? 'Please select an organization' : 
             'Loading dashboard data...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Dashboard Kas</h1>
      
      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card title="Pemasukan" value={money(income)} className="bg-green-50 border-green-200" />
        <Card title="Pengeluaran" value={money(expense)} className="bg-red-50 border-red-200" />
        <Card title="Saldo" value={money(balance)} className="bg-blue-50 border-blue-200" />
        <Card title="Tunggakan" value={money(totalUnpaidAmount)} className="bg-orange-50 border-orange-200" />
      </div>

      {/* Personal Arrears Section */}
      {personalUnpaidAmount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-yellow-800">Tunggakan Pribadi Anda</h3>
              <p className="text-sm sm:text-base text-yellow-700">
                Anda memiliki tunggakan sebesar <span className="font-bold">{money(personalUnpaidAmount)}</span> 
                {personalUnpaidMonths > 0 && (
                  <span> untuk {personalUnpaidMonths} bulan yang belum dibayar</span>
                )}
              </p>
              <p className="text-xs sm:text-sm text-yellow-600 mt-1">
                Silakan lakukan pembayaran melalui menu Pembayaran atau hubungi bendahara.
              </p>
            </div>
          </div>
        </div>
      )}

      {personalUnpaidAmount === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-green-800">Status Pembayaran Anda</h3>
              <p className="text-sm sm:text-base text-green-700">
                Selamat! Anda tidak memiliki tunggakan iuran.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Financial Trend */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Tren Keuangan Bulanan</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Pemasukan, pengeluaran, dan saldo per bulan</p>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value) => [money(value), '']} />
                <Bar dataKey="pemasukan" fill="#10b981" name="Pemasukan" />
                <Bar dataKey="pengeluaran" fill="#ef4444" name="Pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Kategori Pengeluaran</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Distribusi pengeluaran berdasarkan kategori</p>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}%`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600">{item.name}: {money(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Balance and Arrears Trend */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Tren Saldo & Tunggakan</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Perkembangan saldo dan tunggakan dari waktu ke waktu</p>
        </div>
        <div className="p-4 sm:p-6">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value) => [money(value), '']} />
              <Area
                type="monotone"
                dataKey="saldo"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Saldo"
              />
              <Area
                type="monotone"
                dataKey="tunggakan"
                stackId="2"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.6}
                name="Tunggakan"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, className = "" }: { title: string; value: string; className?: string }) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 bg-white shadow-sm ${className}`}>
      <div className="text-xs sm:text-sm text-gray-600">{title}</div>
      <div className="text-lg sm:text-2xl font-semibold break-words">{value}</div>
    </div>
  )
}
