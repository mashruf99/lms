'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute';
import PublicHeader from '@/components/layout/PublicHeader';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { refetch } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      await refetch();
      router.push('/dashboard');
    } catch (err) {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <PublicHeader />

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
            Log in
          </h1>

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

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="text-sm mt-4 text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="underline text-gray-900 dark:text-gray-100">
              Sign up
            </a>
          </p>

          <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
            <a href="/how-to-pay" className="underline text-gray-500 dark:text-gray-500 text-xs">
              How to pay / pricing
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PublicOnlyRoute>
      <LoginForm />
    </PublicOnlyRoute>
  );
}
