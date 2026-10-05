'use client';

import { useState } from 'react';
import Link from 'next/link';
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute';
import PublicHeader from '@/components/layout/PublicHeader';

function ForgotForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/proxy/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Strapi returns { ok: true } even for unknown emails (security).
      // Only show a real error on network/server failures.
      if (!res.ok && res.status >= 500) {
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <PublicHeader />

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8">
          {submitted ? (
            <>
              <h1 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                Check your email
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                If an account with <strong>{email}</strong> exists, we've sent
                a link to reset your password. Check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="inline-block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-5 py-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm text-sm"
              >
                Back to login
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-gray-100">
                Forgot password?
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 dark:focus:border-gray-600 transition-shadow"
                  />
                </div>

                {error && (
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-4 py-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="text-sm mt-4 text-gray-600 dark:text-gray-400">
                Remembered it?{' '}
                <Link href="/login" className="underline text-gray-900 dark:text-gray-100">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <PublicOnlyRoute>
      <ForgotForm />
    </PublicOnlyRoute>
  );
}
