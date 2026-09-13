'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type McqItem = {
  id: number;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  yourAnswer: number | null;
};

type CqItem = {
  id: number;
  text: string;
  marks?: number;
  modelAnswer?: string;
  yourAnswer: string;
};

type ReviewData = {
  type: 'mcq' | 'cq';
  topicName: string;
  score?: number;
  correctCount?: number;
  totalQuestions: number;
  items: (McqItem | CqItem)[];
};

function ReviewContent() {
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch(`/practice/attempt/${attemptId}/review`);
      const json = await res.json();
      setData(json.data ?? null);
      setLoading(false);
    };
    load();
  }, [attemptId]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <p className="p-8">Loading...</p>;
  if (!data) return <p className="p-8">Could not load results.</p>;

  const isMcq = data.type === 'mcq';

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <a href="/practice" className="text-sm underline text-gray-600 mb-4 inline-block">
        ← Back to Practice
      </a>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8 text-center">
        <h1 className="text-lg font-medium text-gray-500 mb-1">{data.topicName}</h1>
        {isMcq ? (
          <>
            <p className="text-4xl font-bold text-gray-900 mb-1">{data.score}%</p>
            <p className="text-gray-600">
              {data.correctCount} of {data.totalQuestions} correct
            </p>
          </>
        ) : (
          <p className="text-gray-600">
            {data.totalQuestions} question{data.totalQuestions !== 1 ? 's' : ''} completed
          </p>
        )}
        <a
          href="/practice/mcq"
          className="inline-block mt-4 bg-gray-900 text-white rounded-md px-5 py-2 text-sm hover:bg-gray-800"
        >
          Retry / Practice Another Topic
        </a>
      </div>

      <h2 className="text-lg font-medium text-gray-900 mb-4">Review</h2>

      <div className="flex flex-col gap-4">
        {data.items.map((item, idx) => {
          const expanded = expandedIds.has(item.id);
          const mcq = item as McqItem;
          const cq = item as CqItem;
          const isCorrect = isMcq && mcq.yourAnswer === mcq.correctOptionIndex;

          return (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <p className="font-medium text-gray-900 mb-3">
                {idx + 1}. {item.text}
              </p>

              {isMcq ? (
                <div className="flex flex-col gap-1 mb-3">
                  {mcq.options.map((opt, i) => {
                    const isYours = mcq.yourAnswer === i;
                    const isRight = mcq.correctOptionIndex === i;
                    return (
                      <div
                        key={i}
                        className={`text-sm px-3 py-1.5 rounded-md ${
                          isRight
                            ? 'bg-green-50 text-green-700 font-medium'
                            : isYours
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-600'
                        }`}
                      >
                        {isRight ? '✓ ' : isYours ? '✗ ' : '– '}
                        {opt}
                        {isYours && !isRight && ' (your answer)'}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Your answer:</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-md p-3">
                    {cq.yourAnswer || <span className="text-gray-400">No answer given</span>}
                  </p>
                </div>
              )}

              <button
                onClick={() => toggleExpand(item.id)}
                className="text-xs underline text-gray-500"
              >
                {expanded ? 'Hide' : 'Show'} {isMcq ? 'Explanation' : 'Model Answer'}
              </button>

              {expanded && (
                <div className="mt-2 text-sm text-gray-700 bg-blue-50 rounded-md p-3 whitespace-pre-wrap">
                  {isMcq
                    ? mcq.explanation || 'No explanation provided.'
                    : cq.modelAnswer || 'No model answer provided.'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <ReviewContent />
      </AppShell>
    </ProtectedRoute>
  );
}
