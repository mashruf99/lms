'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type NavLink = { href: string; label: string };

const NAV_BY_ROLE: Record<string, NavLink[]> = {
  Admin: [
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/topics', label: 'Topics' },
    { href: '/admin/import', label: 'Import' },
    { href: '/admin/review', label: 'Review Answers' },
    { href: '/blog/manage', label: 'Manage Blog' },
    { href: '/blog', label: 'Blog' },
  ],
  Student: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/blog', label: 'Blog' },
  ],
};

function StartPracticingDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/practice"
        className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors inline-block"
      >
        Start Practicing
      </Link>

      {open && (
        <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] z-20">
          <Link
            href="/practice/mcq"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            MCQ
          </Link>
          <Link
            href="/practice/cq"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            CQ
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuth();
  const router = useRouter();

  const links = role ? NAV_BY_ROLE[role] ?? [] : [];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-semibold text-gray-900">
              MCQ Practice
            </Link>
            <nav className="flex items-center gap-1">
              {role === 'Student' && <StartPracticingDropdown />}
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-900 leading-tight">{user?.username}</p>
              <p className="text-xs text-gray-500 leading-tight">{role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-400 text-white rounded-md text-sm border border-red-300 hover:bg-red-600 hover:border-red-400 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
