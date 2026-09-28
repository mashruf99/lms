'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import { apiFetch } from '@/lib/api';

type McqSample = { text: string; options: string[] };
type CqSample = { text: string; marks?: number | null };

type TopicPreview = {
  topicId: string;
  name: string;
  totalMcq: number;
  totalCq: number;
  sampleMcq: McqSample[];
  sampleCq: CqSample[];
};

export default function PublicTopicsPage() {
  const [topics, setTopics] = useState<TopicPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/public/topics');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Failed to load topics');
        setTopics(data.data ?? []);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load topics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalMcq = topics.reduce((sum, t) => sum + t.totalMcq, 0);
  const totalCq = topics.reduce((sum, t) => sum + t.totalCq, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PublicHeader />

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {loading
              ? 'Practice thousands of questions'
              : `Practice ${totalMcq.toLocaleString()}+ MCQ and ${totalCq.toLocaleString()}+ CQ questions`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            Preview the topics below. Sign up for 99৳/month to unlock full practice with instant grading.
          </p>
          <Link
            href="/signup"
            className="inline-block px-6 py-2.5 rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
          >
            Get started — 99৳/month
          </Link>
        </div>

        {/* States */}
        {loading && (
          <p className="text-center text-gray-500 dark:text-gray-400">Loading topics…</p>
        )}

        {error && (
          <p className="text-center text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && !error && topics.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400">No topics available yet.</p>
        )}

        {/* Topic grid */}
        <div className="grid sm:grid-cols-2 gap-5">
          {topics.map((t) => {
            const isExpanded = expandedTopicId === t.topicId;
            const hasSamples = t.sampleMcq.length > 0 || t.sampleCq.length > 0;

            return (
              <div
                key={t.topicId}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 flex flex-col"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {t.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {t.totalMcq} MCQ · {t.totalCq} CQ
                </p>

                {hasSamples && (
                  <button
                    type="button"
                    onClick={() => setExpandedTopicId(isExpanded ? null : t.topicId)}
                    className="text-left text-xs text-blue-600 dark:text-blue-400 hover:underline mb-3 self-start"
                  >
                    {isExpanded ? 'Hide samples ↑' : 'Peek inside →'}
                  </button>
                )}

                {isExpanded && (
                  <div className="space-y-4 mb-3 text-sm">
                    {t.sampleMcq.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Sample MCQs
                        </p>
                        <ul className="space-y-2">
                          {t.sampleMcq.map((q, i) => (
                            <li key={i} className="text-gray-700 dark:text-gray-300">
                              <p className="mb-1">{q.text}</p>
                              <ul className="pl-4 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                {q.options.map((opt, j) => (
                                  <li key={j}>• {opt}</li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {t.sampleCq.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Sample CQs
                        </p>
                        <ul className="space-y-1">
                          {t.sampleCq.map((q, i) => (
                            <li key={i} className="text-gray-700 dark:text-gray-300">
                              {q.text}
                              {q.marks != null && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {' '}
                                  ({q.marks} marks)
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-3">
                  <Link
                    href="/signup"
                    className="block text-center px-4 py-2 rounded-md text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
                    Unlock — 99৳/month
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
