'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute';
import PublicHeader from '@/components/layout/PublicHeader';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Invalid or missing token
  if (!code) {
    return (
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Invalid link
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          This password reset link is invalid or expired. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-5 py-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm text-sm"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/proxy/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          password,
          passwordConfirmation: confirm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Could not reset password. The link may have expired.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to login after a short delay
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-green-700 dark:text-green-300"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Password reset
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Your password has been updated. Redirecting to login…
        </p>
        <Link
          href="/login"
          className="inline-block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-5 py-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm text-sm"
        >
          Go to login now
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8">
      <h1 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-gray-100">
        Set new password
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            New password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 dark:focus:border-gray-600 transition-shadow"
          />
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            At least 6 characters.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Confirm password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 dark:focus:border-gray-600 transition-shadow"
          />
        </div>





        {error && (
          <div className="text-sm">
            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
            <Link
              href="/forgot-password"
              className="text-gray-600 dark:text-gray-400 underline"
            >
              Request a new link →
            </Link>
          </div>
        )}



        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-4 py-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>

      <p className="text-sm mt-4 text-gray-600 dark:text-gray-400">
        <Link href="/login" className="underline text-gray-900 dark:text-gray-100">
          Back to login
        </Link>
      </p>
    </div>
  );
}

function ResetFormWrapper() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <PublicHeader />
      <div className="flex items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-500">
              Loading…
            </div>
          }
        >
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <PublicOnlyRoute>
      <ResetFormWrapper />
    </PublicOnlyRoute>
  );
}
