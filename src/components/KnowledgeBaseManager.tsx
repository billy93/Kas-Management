"use client";
import { useState, useEffect } from "react";

interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    embeddings: number;
  };
}

interface KnowledgeBaseManagerProps {
  organizationId: string;
  organizationName: string;
}

export default function KnowledgeBaseManager({ organizationId, organizationName }: KnowledgeBaseManagerProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [organizationId]);

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/knowledge-base?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setKnowledgeBases(data.knowledgeBases || []);
      } else {
        console.error('Failed to fetch knowledge bases');
      }
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setShowCreateForm(true);
    setEditingKb(null);
    setFormData({ title: '', content: '' });
  };

  const handleEdit = (kb: KnowledgeBase) => {
    setEditingKb(kb);
    setShowCreateForm(true);
    setFormData({ title: kb.title, content: kb.content });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingKb(null);
    setFormData({ title: '', content: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Title dan content harus diisi!');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingKb ? 'PUT' : 'POST';
      const url = editingKb ? `/api/knowledge-base/${editingKb.id}` : '/api/knowledge-base';
      const body = editingKb 
        ? { title: formData.title, content: formData.content }
        : { ...formData, organizationId };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchKnowledgeBases();
        handleCancel();
        alert(editingKb ? 'Knowledge base berhasil diperbarui!' : 'Knowledge base berhasil dibuat!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error saving knowledge base:', error);
      alert('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (kb: KnowledgeBase) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus knowledge base "${kb.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-base/${kb.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchKnowledgeBases();
        alert('Knowledge base berhasil dihapus!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
      alert('Terjadi kesalahan saat menghapus data.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">🧠 Knowledge Base - {organizationName}</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">🧠 Knowledge Base - {organizationName}</h2>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            ➕ Tambah Knowledge Base
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <h3 className="text-md font-semibold mb-4">
              {editingKb ? 'Edit Knowledge Base' : 'Tambah Knowledge Base Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan judul knowledge base"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={8}
                  placeholder="Masukkan konten knowledge base..."
                  disabled={submitting}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  {submitting ? '⏳ Menyimpan...' : (editingKb ? '💾 Update' : '💾 Simpan')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  ❌ Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Knowledge Base List */}
        {knowledgeBases.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Belum ada knowledge base. Silakan tambah knowledge base baru untuk meningkatkan kemampuan chatbot.
          </p>
        ) : (
          <div className="space-y-4">
            {knowledgeBases.map((kb) => (
              <div key={kb.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{kb.title}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(kb)}
                      className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors duration-200"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(kb)}
                      className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs transition-colors duration-200"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2 line-clamp-3">
                  {kb.content.length > 200 ? `${kb.content.substring(0, 200)}...` : kb.content}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>📊 {kb._count.embeddings} embeddings</span>
                  <span>📅 {new Date(kb.updatedAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}