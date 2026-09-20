'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type TopicProgress = {
  topicId: string;
  name: string;
  attempts: number;
  questionsSolved: number;
  totalQuestions: number;
  bestScore: number;
};

type DashboardData = {
  totalAttempts: number;
  mcqAttempts: number;
  cqAttempts: number;
  mcqQuestionsSolved: number;
  cqQuestionsSolved: number;
  averageMcqScore: number;
  topicProgress: TopicProgress[];
};

function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch('/practice/dashboard');
      const json = await res.json();
      setData(json.data ?? null);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="p-8">Loading...</p>;
  if (!data) return <p className="p-8">Could not load dashboard.</p>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">My Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm text-center">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.totalAttempts}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Attempts</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm text-center">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.mcqQuestionsSolved}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">MCQ Solved</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm text-center">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.cqQuestionsSolved}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CQ Solved</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm text-center">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.averageMcqScore}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Avg MCQ Score</p>
        </div>
      </div>

      <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">Progress by Topic</h2>
      {data.topicProgress.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No practice sessions yet. Start practicing to see your progress here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.topicProgress.map((t) => {
            const percent = t.totalQuestions > 0 ? Math.round((t.questionsSolved / t.totalQuestions) * 100) : 0;
            return (
              <li key={t.topicId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{t.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t.questionsSolved}/{t.totalQuestions} · best {t.bestScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-gray-900 dark:bg-gray-100 h-2 rounded-full" style={{ width: `${percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (role === 'Admin') {
      router.push('/admin/users');
    }
  }, [user, role, loading, router]);

  if (loading || !user || role === 'Admin') {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AppShell>
      <StudentDashboard />
    </AppShell>
  );
}
