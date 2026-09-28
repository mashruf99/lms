'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function PublicHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const onLoginPage = pathname === '/login';
  const onSignupPage = pathname === '/signup';

  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900 dark:text-gray-100">
          Learning Management System
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/topics"
            className="px-3 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Topics
          </Link>
          <Link
            href="/blog"
            className="px-3 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Blog
          </Link>

          {loading ? null : user ? (
            <Link
              href="/dashboard"
              className="px-4 py-1.5 rounded-md text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
            >
              Dashboard
            </Link>
          ) : (
            <>
              {!onLoginPage && (
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Log in
                </Link>
              )}
              {!onSignupPage && (
                <Link
                  href="/signup"
                  className="px-4 py-1.5 rounded-md text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
