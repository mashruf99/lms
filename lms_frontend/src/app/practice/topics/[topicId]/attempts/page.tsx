'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type AttemptItem = {
  attemptId: string;
  type: 'mcq' | 'cq';
  score: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  completedAt: string;
};

type TopicAttempts = {
  topicId: string;
  topicName: string;
  totalAttempts: number;
  items: AttemptItem[];
};

function bucketFor(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(startOfToday);
  startOfMonth.setDate(startOfMonth.getDate() - 29);

  if (d >= startOfToday) return 'Today';
  if (d >= startOfYesterday) return 'Yesterday';
  if (d >= startOfWeek) return 'This week';
  if (d >= startOfMonth) return 'This month';
  return 'Older';
}

const BUCKET_ORDER = ['Today', 'Yesterday', 'This week', 'This month', 'Older'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TopicAttemptsContent() {
  const params = useParams();
  const topicId = params.topicId as string;

  const [data, setData] = useState<TopicAttempts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/practice/topics/${topicId}/attempts`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load attempts');
        setData(json.data ?? null);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load attempts');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [topicId]);

  if (loading) return <p className="p-8">Loading…</p>;
  if (error) return <p className="p-8 text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return <p className="p-8">No data.</p>;

  // Group by bucket
  const groups = new Map<string, AttemptItem[]>();
  for (const item of data.items) {
    const b = bucketFor(item.completedAt);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)!.push(item);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="text-sm underline text-gray-600 dark:text-gray-400 mb-4 inline-block"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {data.topicName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {data.totalAttempts} attempt{data.totalAttempts !== 1 ? 's' : ''}
        </p>
      </div>

      {data.items.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          You haven't completed any attempts on this topic yet.
        </p>
      ) : (
        BUCKET_ORDER.map((bucket) => {
          const items = groups.get(bucket);
          if (!items || items.length === 0) return null;
          return (
            <section key={bucket} className="mb-6">
              <h2 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                {bucket}
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((a) => (
                  <li
                    key={a.attemptId}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {a.type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(a.completedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {a.type === 'mcq' && a.score !== null
                          ? `${a.correctCount}/${a.totalQuestions} · ${a.score}%`
                          : `${a.totalQuestions ?? 0} questions`}
                      </p>
                    </div>
                    <Link
                      href={`/practice/review/${a.attemptId}`}
                      className="text-sm underline text-gray-900 dark:text-gray-100 whitespace-nowrap"
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

export default function TopicAttemptsPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <TopicAttemptsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
