"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category?: string;
  occurredAt: string;
  note?: string;
  createdBy?: {
    name?: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const { selectedOrganization, loading: orgLoading } = useOrganization();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    amount: "",
    category: "",
    occurredAt: new Date().toISOString().split('T')[0],
    note: ""
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  useEffect(() => {
    if (selectedOrganization && !orgLoading) {
      fetchTransactions();
    }
  }, [selectedOrganization, orgLoading]);

  const fetchTransactions = async () => {
    if (!selectedOrganization) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/transactions?organizationId=${selectedOrganization.id}`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization || !formData.amount) return;

    try {
      const url = editingTransaction 
        ? `/api/transactions/${editingTransaction.id}`
        : "/api/transactions";
      const method = editingTransaction ? "PUT" : "POST";
      
      const body = editingTransaction 
        ? {
            type: formData.type,
            amount: parseInt(formData.amount),
            category: formData.category || null,
            occurredAt: formData.occurredAt,
            note: formData.note || null,
          }
        : {
            organizationId: selectedOrganization.id,
            type: formData.type,
            amount: parseInt(formData.amount),
            category: formData.category || null,
            occurredAt: formData.occurredAt,
            note: formData.note || null,
            createdById: session?.user?.id,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        resetForm();
        fetchTransactions();
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "EXPENSE",
      amount: "",
      category: "",
      occurredAt: new Date().toISOString().split('T')[0],
      note: ""
    });
    setShowForm(false);
    setEditingTransaction(null);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      category: transaction.category || "",
      occurredAt: transaction.occurredAt.split('T')[0],
      note: transaction.note || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShowDeleteConfirm(null);
        fetchTransactions();
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (status === "loading" || orgLoading || !selectedOrganization) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">
          {status === "loading" ? 'Loading session...' :
           orgLoading ? 'Loading organizations...' :
           !selectedOrganization ? 'Please select an organization' :
           'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">💰 Transaksi Keuangan</h1>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base"
        >
          {showForm ? "❌ Batal" : "➕ Tambah Transaksi"}
        </button>
      </div>



      {/* Add Transaction Form */}
      {showForm && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            {editingTransaction ? "✏️ Edit Transaksi" : "➕ Tambah Transaksi Baru"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Transaksi *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "INCOME" | "EXPENSE" })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="EXPENSE">💸 Pengeluaran</option>
                  <option value="INCOME">💰 Pemasukan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah (IDR) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan jumlah"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contoh: Konsumsi, ATK, Donasi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal *
                </label>
                <input
                  type="date"
                  value={formData.occurredAt}
                  onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Catatan tambahan (opsional)"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base"
              >
                {editingTransaction ? "💾 Update Transaksi" : "💾 Simpan Transaksi"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-3 sm:px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base"
              >
                ❌ Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg sm:text-xl font-semibold">Riwayat Transaksi</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-sm sm:text-lg">Memuat transaksi...</div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-base sm:text-lg mb-2">📝 Belum ada transaksi</div>
            <div className="text-sm sm:text-base">Klik "Tambah Transaksi" untuk memulai mencatat keuangan</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700">Tanggal</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700">Jenis</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 hidden sm:table-cell">Kategori</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-700">Jumlah</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">Catatan</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700 hidden lg:table-cell">Dibuat oleh</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                      <div className="sm:hidden">{new Date(transaction.occurredAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" })}</div>
                      <div className="hidden sm:block">{formatDate(transaction.occurredAt)}</div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      <span
                        className={`inline-flex items-center px-1 sm:px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === "INCOME"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        <span className="sm:hidden">{transaction.type === "INCOME" ? "💰" : "💸"}</span>
                        <span className="hidden sm:inline">{transaction.type === "INCOME" ? "💰 Pemasukan" : "💸 Pengeluaran"}</span>
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                      {transaction.category || "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right font-medium">
                      <span
                        className={transaction.type === "INCOME" ? "text-green-600" : "text-red-600"}
                      >
                        <div className="sm:hidden">{transaction.type === "INCOME" ? "+" : "-"}{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(transaction.amount)}</div>
                        <div className="hidden sm:block">{transaction.type === "INCOME" ? "+" : "-"}{formatCurrency(transaction.amount)}</div>
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                      {transaction.note || "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                      {transaction.createdBy?.name || "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                      <div className="flex justify-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="px-1 sm:px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors duration-200"
                          title="Edit transaksi"
                        >
                          <span className="sm:hidden">✏️</span>
                          <span className="hidden sm:inline">✏️ Edit</span>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(transaction.id)}
                          className="px-1 sm:px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors duration-200"
                          title="Hapus transaksi"
                        >
                          <span className="sm:hidden">🗑️</span>
                          <span className="hidden sm:inline">🗑️ Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Delete */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">🗑️ Konfirmasi Hapus</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-3 sm:px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base order-2 sm:order-1"
              >
                ❌ Batal
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base order-1 sm:order-2"
              >
                🗑️ Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}