'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Topic = {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  questions?: { id: number }[];
};

function TopicsContent() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTopics = async () => {
    setLoading(true);
    const res = await apiFetch('/topics?populate=questions&pagination[pageSize]=100');
    const data = await res.json();
    setTopics(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    const res = await apiFetch('/topics', {
      method: 'POST',
      body: JSON.stringify({ data: { name, description: description || null } }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Failed to create topic');
      setCreating(false);
      return;
    }

    setName('');
    setDescription('');
    setCreating(false);
    await loadTopics();
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this topic? Questions under it will remain but become unassigned.')) return;
    await apiFetch(`/topics/${documentId}`, { method: 'DELETE' });
    await loadTopics();
  };

  const startEdit = (topic: Topic) => {
    setEditingId(topic.documentId);
    setEditName(topic.name);
    setEditDescription(topic.description ?? '');
  };

  const saveEdit = async (documentId: string) => {
    setSaving(true);
    await apiFetch(`/topics/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { name: editName, description: editDescription || null } }),
    });
    setSaving(false);
    setEditingId(null);
    await loadTopics();
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">Manage Topics</h1>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <input
          type="text"
          required
          placeholder="Topic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-gray-900 text-white rounded-md px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-50 self-start"
        >
          {creating ? 'Creating...' : 'Create Topic'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {topics.length === 0 ? (
        <p className="text-gray-500">No topics yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {topics.map((topic) =>
            editingId === topic.documentId ? (
              <li key={topic.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Description"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => saveEdit(topic.documentId)}
                    disabled={saving}
                    className="bg-gray-900 text-white rounded-md px-4 py-2 text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm underline text-gray-600">
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li key={topic.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{topic.name}</p>
                  <p className="text-sm text-gray-500">
                    {topic.questions?.length ?? 0} questions
                    {topic.description && ` — ${topic.description}`}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0 ml-4">
                  <Link href={`/admin/topics/${topic.documentId}`} className="text-sm underline text-gray-700">
                    Manage Questions
                  </Link>
                  <button onClick={() => startEdit(topic)} className="text-sm underline text-gray-700">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(topic.documentId)}
                    className="text-sm text-red-600 underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

export default function TopicsPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <AppShell>
        <TopicsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
