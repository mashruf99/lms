'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/ui/ConfirmModal';

type TopicSummary = {
  topicId: string;
  name: string;
  totalQuestions: number;
  seenCount: number;
  attemptCount: number;
  lastAttemptAt: string | null;
};

export default function TopicGrid({ type }: { type: 'mcq' | 'cq' }) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [pendingTopic, setPendingTopic] = useState<TopicSummary | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // ─── Subscription state ─────────────────────────────────
  const expiry = user?.accessExpiresAt ? new Date(user.accessExpiresAt) : null;
  const subscriptionActive = !!expiry && expiry.getTime() > Date.now();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await apiFetch(`/practice/topics?type=${type}`);
      const data = await res.json();
      setTopics(data.data ?? []);
      setLoading(false);
    };
    load();
  }, [type]);

  const handleStart = async (topicId: string) => {
    setStartingId(topicId);
    const res = await apiFetch('/practice/start', {
      method: 'POST',
      body: JSON.stringify({ topicId, type }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error?.message || 'Could not start practice session');
      setStartingId(null);
      return;
    }

    const data = await res.json();
    sessionStorage.setItem(`practice-session-${data.data.attemptId}`, JSON.stringify(data.data));
    router.push(`/practice/session/${data.data.attemptId}`);
  };

  if (loading) {
    return <p className="p-8 text-gray-500 dark:text-gray-400">Loading topics...</p>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        {type === 'mcq' ? 'MCQ Topics' : 'CQ Topics'}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
        {subscriptionActive
          ? 'Choose a topic to start a practice session.'
          : 'Browse topics below. Renew to start practicing.'}
      </p>

      {/* Subscription warning banner (only when expired) */}
      {!subscriptionActive && (
        <div className="mb-6 px-4 py-3 rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-800 dark:text-red-300 flex items-center justify-between gap-4">
          <span>
            <strong>Your subscription has expired.</strong> You can view past
            attempts but can't start new sessions.
          </span>
          <Link
            href="/renew"
            className="underline font-medium text-red-900 dark:text-red-200 whitespace-nowrap"
          >
            Renew now
          </Link>
        </div>
      )}

      {topics.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No topics available yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {topics.map((t) => {
            const hasQuestions = t.totalQuestions > 0;
            const isStarting = startingId === t.topicId;
            const startDisabled = !hasQuestions || startingId !== null;

            const pct =
              t.totalQuestions > 0
                ? Math.round((t.seenCount / t.totalQuestions) * 100)
                : 0;

            return (
              <div
                key={t.topicId}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm dark:shadow-none p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {!hasQuestions
                      ? 'No questions available yet'
                      : `${t.seenCount}/${t.totalQuestions} seen`}
                  </p>

                  {hasQuestions && (
                    <div
                      className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {t.attemptCount > 0 && (
                    <span className="inline-block mt-3 text-xs rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      Attempted {t.attemptCount}×
                    </span>
                  )}
                </div>

                {/* Button — state-dependent */}
                {subscriptionActive ? (
                  <button
                    onClick={() => setPendingTopic(t)}
                    disabled={startDisabled}
                    className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 rounded-md px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isStarting
                      ? 'Starting...'
                      : t.attemptCount > 0
                      ? 'Retry'
                      : 'Start'}
                  </button>
                ) : (
                  <Link
                    href="/renew"
                    className={`rounded-md px-4 py-2 text-sm transition-colors text-center ${
                      hasQuestions
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 pointer-events-none'
                    }`}
                  >
                    {hasQuestions ? 'Renew to start' : 'Renew'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={pendingTopic !== null}
        title="Start practice session?"
        message={
          pendingTopic
            ? `Are you sure you want to start ${pendingTopic.name} ${type.toUpperCase()}?`
            : ''
        }
        confirmLabel="Start"
        onConfirm={() => {
          if (pendingTopic && subscriptionActive) handleStart(pendingTopic.topicId);
          setPendingTopic(null);
        }}
        onCancel={() => setPendingTopic(null)}
      />
    </div>
  );
}
