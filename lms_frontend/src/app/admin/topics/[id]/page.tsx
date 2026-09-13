'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Question = {
  id: number;
  documentId: string;
  text: string;
  options: string[];
  correctOptionIndex: number | null;
  explanation?: string;
};

type Topic = { id: number; documentId: string; name: string };

function emptyOptions(n = 4) {
  return Array.from({ length: n }, () => '');
}

function TopicQuestionsContent() {
  const params = useParams();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  // create form
  const [newText, setNewText] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(emptyOptions());
  const [newCorrect, setNewCorrect] = useState<number | null>(null);
  const [newExplanation, setNewExplanation] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>(emptyOptions());
  const [editCorrect, setEditCorrect] = useState<number | null>(null);
  const [editExplanation, setEditExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async (pageNum = 1) => {
    setLoading(true);

    const topicRes = await apiFetch(`/topics/${topicId}`);
    const topicData = await topicRes.json();
    setTopic(topicData.data ?? null);

    const qRes = await apiFetch(
      `/questions?filters[topic][documentId][$eq]=${topicId}&pagination[page]=${pageNum}&pagination[pageSize]=20&sort=id:asc`
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

    const filledOptions = newOptions.filter((o) => o.trim() !== '');
    if (filledOptions.length < 2) {
      setError('Provide at least 2 options');
      return;
    }
    if (newCorrect === null || newCorrect >= filledOptions.length) {
      setError('Select the correct option');
      return;
    }

    setCreating(true);

    const res = await apiFetch('/questions', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          text: newText,
          options: filledOptions,
          correctOptionIndex: newCorrect,
          explanation: newExplanation || null,
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
    setNewOptions(emptyOptions());
    setNewCorrect(null);
    setNewExplanation('');
    setCreating(false);
    await loadData(1);
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this question?')) return;
    await apiFetch(`/questions/${documentId}`, { method: 'DELETE' });
    await loadData(page);
  };

  const startEdit = (q: Question) => {
    setEditingId(q.documentId);
    setEditText(q.text);
    setEditOptions([...q.options, ...emptyOptions(Math.max(0, 4 - q.options.length))].slice(0, Math.max(4, q.options.length)));
    setEditCorrect(q.correctOptionIndex);
    setEditExplanation(q.explanation ?? '');
  };

  const saveEdit = async (documentId: string) => {
    const filledOptions = editOptions.filter((o) => o.trim() !== '');
    if (filledOptions.length < 2 || editCorrect === null || editCorrect >= filledOptions.length) {
      alert('Provide at least 2 options and a valid correct answer selection');
      return;
    }

    setSaving(true);
    await apiFetch(`/questions/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          text: editText,
          options: filledOptions,
          correctOptionIndex: editCorrect,
          explanation: editExplanation || null,
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
        Questions — {topic?.name ?? 'Topic'}
      </h1>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex flex-col gap-3 mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <p className="font-medium text-sm text-gray-700">Add a new question</p>
        <input
          type="text"
          required
          placeholder="Question text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        {newOptions.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="new-correct"
              checked={newCorrect === i}
              onChange={() => setNewCorrect(i)}
            />
            <input
              type="text"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const next = [...newOptions];
                next[i] = e.target.value;
                setNewOptions(next);
              }}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        ))}
        <textarea
          placeholder="Explanation (optional)"
          value={newExplanation}
          onChange={(e) => setNewExplanation(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
          rows={2}
        />
        <p className="text-xs text-gray-500">Select the radio button next to the correct answer.</p>
        <button
          type="submit"
          disabled={creating}
          className="bg-gray-900 text-white rounded-md px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-50 self-start"
        >
          {creating ? 'Adding...' : 'Add Question'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {/* Question list */}
      {questions.length === 0 ? (
        <p className="text-gray-500">No questions yet.</p>
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
                {editOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`edit-correct-${q.id}`}
                      checked={editCorrect === i}
                      onChange={() => setEditCorrect(i)}
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...editOptions];
                        next[i] = e.target.value;
                        setEditOptions(next);
                      }}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                ))}
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  placeholder="Explanation"
                  className="border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
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
                <div className="flex justify-between items-start">
                  <p className="font-medium text-gray-900">{q.text}</p>
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
                <ul className="mt-2 text-sm text-gray-600">
                  {q.options?.map((opt, i) => (
                    <li key={i} className={i === q.correctOptionIndex ? 'text-green-600 font-medium' : ''}>
                      {i === q.correctOptionIndex ? '✓ ' : '– '}
                      {opt}
                    </li>
                  ))}
                </ul>
                {q.correctOptionIndex === null && (
                  <p className="text-xs text-amber-600 mt-1">⚠ No correct answer set yet</p>
                )}
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

export default function TopicQuestionsPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <AppShell>
        <TopicQuestionsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
