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

const inputCls =
  'w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-gray-500';

const primaryBtn =
  'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 rounded-md px-4 py-2 text-sm transition-colors disabled:opacity-50';

const actionLink =
  'text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white underline underline-offset-4 decoration-gray-300 dark:decoration-gray-700 hover:decoration-current';

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

  if (loading) return <p className="p-8 text-gray-500 dark:text-gray-400">Loading...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Manage Topics</h1>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 mb-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm dark:shadow-none p-4"
      >
        <input
          type="text"
          required
          placeholder="Topic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
        />
        <button type="submit" disabled={creating} className={`${primaryBtn} self-start`}>
          {creating ? 'Creating...' : 'Create Topic'}
        </button>
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
      </form>

      {topics.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No topics yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {topics.map((topic) =>
            editingId === topic.documentId ? (
              <li
                key={topic.id}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={inputCls}
                  placeholder="Description"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveEdit(topic.documentId)}
                    disabled={saving}
                    className={primaryBtn}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={topic.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm dark:shadow-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{topic.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {topic.questions?.length ?? 0} questions
                    {topic.description && ` — ${topic.description}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 shrink-0">
                  <Link href={`/admin/topics/${topic.documentId}`} className={actionLink}>
                    Manage Questions
                  </Link>
                  <Link href={`/admin/topics/${topic.documentId}/written`} className={actionLink}>
                    Manage Written (CQ)
                  </Link>
                  <button onClick={() => startEdit(topic)} className={actionLink}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(topic.documentId)}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-4 decoration-red-200 dark:decoration-red-500/30 hover:decoration-current"
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
