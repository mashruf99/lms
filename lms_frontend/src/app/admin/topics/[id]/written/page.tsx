'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type WrittenQuestion = {
  id: number;
  documentId: string;
  text: string;
  marks?: number | null;
  modelAnswer?: string;
  citation?: string | null;
};

type Topic = { id: number; documentId: string; name: string };

function WrittenQuestionsContent() {
  const params = useParams();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<WrittenQuestion[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  const [newText, setNewText] = useState('');
  const [newMarks, setNewMarks] = useState('');
  const [newCitation, setNewCitation] = useState('');
  const [newModelAnswer, setNewModelAnswer] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editMarks, setEditMarks] = useState('');
  const [editCitation, setEditCitation] = useState('');
  const [editModelAnswer, setEditModelAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async (pageNum = 1) => {
    setLoading(true);

    const topicRes = await apiFetch(`/topics/${topicId}`);
    const topicData = await topicRes.json();
    setTopic(topicData.data ?? null);

    const qRes = await apiFetch(
      `/written-questions?filters[topic][documentId][$eq]=${topicId}&pagination[page]=${pageNum}&pagination[pageSize]=10&sort=id:asc`
    );
    const qData = await qRes.json();
    setQuestions(qData.data ?? []);
    setPageCount(qData.meta?.pagination?.pageCount ?? 1);
    setPage(pageNum);

    setLoading(false);
  };

  useEffect(() => {
    loadData(1);
  }, [topicId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newText.trim() || !newModelAnswer.trim()) {
      setError('Question text and model answer are required');
      return;
    }

    setCreating(true);

    const res = await apiFetch('/written-questions', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          text: newText,
          marks: newMarks ? Number(newMarks) : null,
          citation: newCitation || null,
          modelAnswer: newModelAnswer,
          topic: topicId,
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Failed to create question');
      setCreating(false);
      return;
    }

    setNewText('');
    setNewMarks('');
    setNewCitation('');
    setNewModelAnswer('');
    setCreating(false);
    await loadData(1);
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this question?')) return;
    await apiFetch(`/written-questions/${documentId}`, { method: 'DELETE' });
    await loadData(page);
  };

  const startEdit = (q: WrittenQuestion) => {
    setEditingId(q.documentId);
    setEditText(q.text);
    setEditMarks(q.marks != null ? String(q.marks) : '');
    setEditCitation(q.citation ?? '');
    setEditModelAnswer(q.modelAnswer ?? '');
  };

  const saveEdit = async (documentId: string) => {
    setSaving(true);
    await apiFetch(`/written-questions/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          text: editText,
          marks: editMarks ? Number(editMarks) : null,
          citation: editCitation || null,
          modelAnswer: editModelAnswer,
        },
      }),
    });
    setSaving(false);
    setEditingId(null);
    await loadData(page);
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <a href="/admin/topics" className="text-sm underline mb-4 inline-block text-gray-600">
        ← Back to Topics
      </a>
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">
        Written Questions (CQ) — {topic?.name ?? 'Topic'}
      </h1>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <p className="font-medium text-sm text-gray-700">Add a new written question</p>
        <input
          type="text"
          required
          placeholder="Question text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <input
          type="number"
          placeholder="Marks (optional)"
          value={newMarks}
          onChange={(e) => setNewMarks(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <input
          type="text"
          placeholder="Citation / source (optional)"
          value={newCitation}
          onChange={(e) => setNewCitation(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <textarea
          required
          placeholder="Model answer (markdown supported)"
          value={newModelAnswer}
          onChange={(e) => setNewModelAnswer(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
          rows={6}
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-gray-900 text-white rounded-md px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-50 self-start"
        >
          {creating ? 'Adding...' : 'Add Question'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {questions.length === 0 ? (
        <p className="text-gray-500">No written questions yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {questions.map((q) =>
            editingId === q.documentId ? (
              <li key={q.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Marks"
                  value={editMarks}
                  onChange={(e) => setEditMarks(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Citation"
                  value={editCitation}
                  onChange={(e) => setEditCitation(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  value={editModelAnswer}
                  onChange={(e) => setEditModelAnswer(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                  rows={10}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => saveEdit(q.documentId)}
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
              <li key={q.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-gray-900">
                    {q.text} {q.marks != null && <span className="text-xs text-gray-400">({q.marks} marks)</span>}
                  </p>
                  <div className="flex gap-3 shrink-0 ml-4">
                    <button onClick={() => startEdit(q)} className="text-sm underline text-gray-700">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q.documentId)}
                      className="text-sm text-red-600 underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {q.citation && (
                  <p className="text-xs text-gray-400 mb-2">Source: {q.citation}</p>
                )}
                <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">
                  {q.modelAnswer}
                </p>
              </li>
            )
          )}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="flex gap-2 mt-6 justify-center">
          <button
            onClick={() => loadData(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600 px-2 py-1">
            Page {page} of {pageCount}
          </span>
          <button
            onClick={() => loadData(page + 1)}
            disabled={page >= pageCount}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function WrittenQuestionsPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <AppShell>
        <WrittenQuestionsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
