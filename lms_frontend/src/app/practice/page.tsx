'use client';

import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';

function PracticeLandingContent() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-gray-100">Start Practicing</h1>
      <div className="grid sm:grid-cols-2 gap-6">
        <Link
          href="/practice/mcq"
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-8 text-center"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">MCQ</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Multiple-choice practice, instantly graded</p>
        </Link>
        <Link
          href="/practice/cq"
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-8 text-center"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">CQ</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Written practice, self-review against model answers</p>
        </Link>
      </div>
    </div>
  );
}

export default function PracticeLandingPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <PracticeLandingContent />
      </AppShell>
    </ProtectedRoute>
  );
}
