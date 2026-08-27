'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function PublicHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900">
          Learning Management System
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/blog"
            className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Blog
          </Link>

          {loading ? null : user ? (
            <Link
              href="/dashboard"
              className="px-4 py-1.5 rounded-md text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-md text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
