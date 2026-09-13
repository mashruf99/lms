'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

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
  const router = useRouter();

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

  if (loading) return <p className="p-8">Loading topics...</p>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">
        {type === 'mcq' ? 'MCQ Topics' : 'CQ Topics'}
      </h1>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {topics.map((t) => {
          const disabled = t.totalQuestions === 0 || startingId !== null;
          return (
            <div
              key={t.topicId}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-medium text-gray-900 mb-1">{t.name}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {t.totalQuestions === 0
                    ? 'No questions available yet'
                    : `${t.seenCount}/${t.totalQuestions} seen`}
                </p>
                {t.attemptCount > 0 && (
                  <span className="inline-block text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 mb-3">
                    Attempted {t.attemptCount}×
                  </span>
                )}
              </div>
              <button
                onClick={() => handleStart(t.topicId)}
                disabled={disabled}
                className="bg-gray-900 text-white rounded-md px-4 py-2 text-sm hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {startingId === t.topicId
                  ? 'Starting...'
                  : t.attemptCount > 0
                  ? 'Retry'
                  : 'Start'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
