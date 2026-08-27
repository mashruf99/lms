'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute';

function SignupForm() {
  const [username, setUsername] = useState('');
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
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
    <div className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">Sign up</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-shadow"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white rounded-md px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-sm mt-4 text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="underline text-gray-900">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <PublicOnlyRoute>
      <SignupForm />
    </PublicOnlyRoute>
  );
}
