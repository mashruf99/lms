'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Question = {
  id: number;
  documentId: string;
  text: string;
  options: string[];
  topic?: { id: number; name: string };
};

function ReviewContent() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [explanation, setExplanation] = useState('');
  const [reviewedCount, setReviewedCount] = useState(0);

  const loadBatch = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/questions/needs-answer?pageSize=25&page=1');
    const data = await res.json();
    setQuestions(data.data ?? []);
    setTotal(data.meta?.total ?? 0);
    setIndex(0);
    setSelectedOption(null);
    setExplanation('');
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  const current = questions[index];

  const handleSubmit = async () => {
    if (!current || selectedOption === null) return;
    setSaving(true);

    await apiFetch(`/questions/${current.documentId}/set-answer`, {
      method: 'PUT',
      body: JSON.stringify({
        correctOptionIndex: selectedOption,
        explanation: explanation || undefined,
      }),
    });

    setReviewedCount((c) => c + 1);
    setSaving(false);
    setSelectedOption(null);
    setExplanation('');

    if (index + 1 < questions.length) {
      setIndex(index + 1);
    } else {
      // batch exhausted, fetch the next one
      await loadBatch();
    }
  };

  const handleSkip = () => {
    setSelectedOption(null);
    setExplanation('');
    if (index + 1 < questions.length) {
      setIndex(index + 1);
    } else {
      loadBatch();
    }
  };

  if (loading) return <p className="p-8">Loading...</p>;

  if (!current) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900">All caught up 🎉</h1>
        <p className="text-gray-600">No questions currently need an answer set.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Set Correct Answers</h1>
        <span className="text-sm text-gray-500">
          {total} remaining · {reviewedCount} reviewed this session
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        {current.topic && (
          <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1 mb-3">
            {current.topic.name}
          </span>
        )}

        <p className="font-medium text-gray-900 mb-4">{current.text}</p>

        <div className="flex flex-col gap-2 mb-4">
          {current.options?.map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 border rounded-lg px-4 py-2 cursor-pointer transition-colors ${
                selectedOption === i
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="answer"
                checked={selectedOption === i}
                onChange={() => setSelectedOption(i)}
              />
              <span className="text-sm text-gray-800">{opt}</span>
            </label>
          ))}
        </div>

        <textarea
          placeholder="Explanation (optional)"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
          rows={2}
        />

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null || saving}
            className="bg-gray-900 text-white rounded-md px-5 py-2 text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Next'}
          </button>
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <AppShell>
        <ReviewContent />
      </AppShell>
    </ProtectedRoute>
  );
}
