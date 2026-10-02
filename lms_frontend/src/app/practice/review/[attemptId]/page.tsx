'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type McqItem = {
  id: number;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  citation?: string | null;
  yourAnswer: number | null;
};

type CqItem = {
  id: number;
  text: string;
  marks?: number;
  modelAnswer?: string;
  citation?: string | null;
  yourAnswer: string;
};

type ReviewData = {
  type: 'mcq' | 'cq';
  topicName: string;
  score?: number;
  correctCount?: number;
  totalQuestions: number;
  answeredCount?: number;
  skippedCount?: number;
  items: (McqItem | CqItem)[];
};

function ReviewContent() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

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

  const handleRetrySkipped = async () => {
    if (!data || retrying) return;
    setRetrying(true);
    setRetryError('');

    try {
      const res = await apiFetch('/practice/retry-skipped', {
        method: 'POST',
        body: JSON.stringify({ attemptId }),
      });

      const json = await res.json();

      if (!res.ok) {
        setRetryError(json.error?.message || 'Could not start retry session');
        setRetrying(false);
        return;
      }

      sessionStorage.setItem(
        `practice-session-${json.data.attemptId}`,
        JSON.stringify(json.data)
      );
      router.push(`/practice/session/${json.data.attemptId}`);
    } catch (err) {
      setRetryError('Something went wrong. Please try again.');
      setRetrying(false);
    }
  };

  if (loading) return <p className="p-8">Loading...</p>;
  if (!data) return <p className="p-8">Could not load results.</p>;

  const isMcq = data.type === 'mcq';
  const hasSkipped = typeof data.skippedCount === 'number' && data.skippedCount > 0;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <a
        href="/practice"
        className="text-sm underline text-gray-600 dark:text-gray-400 mb-4 inline-block"
      >
        ← Back to Practice
      </a>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 mb-8 text-center">
        <h1 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-1">
          {data.topicName}
        </h1>
        {isMcq ? (
          <>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {data.score}%
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              {data.correctCount} of {data.totalQuestions} correct
            </p>
          </>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            {data.totalQuestions} question
            {data.totalQuestions !== 1 ? 's' : ''} completed
          </p>
        )}

        {/* Retry skipped — primary action when there are skipped questions */}
        {hasSkipped && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleRetrySkipped}
              disabled={retrying}
              className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md px-5 py-2.5 text-sm transition-colors shadow-sm"
            >
              {retrying
                ? 'Starting…'
                : `Retry ${data.skippedCount} skipped question${
                    data.skippedCount === 1 ? '' : 's'
                  }`}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Start a new session with only the questions you skipped.
            </p>
            {retryError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                {retryError}
              </p>
            )}
          </div>
        )}

        {!hasSkipped && (
          <a
            href="/practice/mcq"
            className="inline-block mt-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-5 py-2 text-sm hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Retry / Practice Another Topic
          </a>
        )}
      </div>

      {hasSkipped && (
        <div className="mb-6 px-4 py-3 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
          You skipped <strong>{data.skippedCount}</strong>{' '}
          {data.skippedCount === 1 ? 'question' : 'questions'}. Only answered
          questions appear below. Use the <strong>Retry</strong> button above to
          attempt the rest.
        </div>
      )}

      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Review
      </h2>

      {data.items.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You didn't answer any questions in this session.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {data.items.map((item, idx) => {
          const expanded = expandedIds.has(item.id);
          const mcq = item as McqItem;
          const cq = item as CqItem;
          const isCorrect = isMcq && mcq.yourAnswer === mcq.correctOptionIndex;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                {idx + 1}. {item.text}
              </p>
              {item.citation && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Source: {item.citation}
                </p>
              )}

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
                            ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 font-medium'
                            : isYours
                            ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
                            : 'text-gray-600 dark:text-gray-400'
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Your answer:
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 rounded-md p-3">
                    {cq.yourAnswer || (
                      <span className="text-gray-400 dark:text-gray-500">
                        No answer given
                      </span>
                    )}
                  </p>
                </div>
              )}

              <button
                onClick={() => toggleExpand(item.id)}
                className="text-xs underline text-gray-500 dark:text-gray-400"
              >
                {expanded ? 'Hide' : 'Show'}{' '}
                {isMcq ? 'Explanation' : 'Model Answer'}
              </button>

              {expanded && (
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-500/10 rounded-md p-3 whitespace-pre-wrap">
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
