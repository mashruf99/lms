'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type NavLink = { href: string; label: string };

const NAV_BY_ROLE: Record<string, NavLink[]> = {
  Admin: [
    { href: '/admin/users', label: 'Admin' },
    { href: '/courses/manage', label: 'Courses' },
    { href: '/blog/manage', label: 'Manage Blog' },
    { href: '/blog', label: 'Blog' },
  ],
  'Content Manager': [
    { href: '/courses/manage', label: 'Courses' },
    { href: '/blog/manage', label: 'Manage Blog' },
    { href: '/blog', label: 'Blog' },
  ],
  Instructor: [
    { href: '/courses/manage', label: 'My Courses' },
    { href: '/blog', label: 'Blog' },
  ],
  Student: [
    { href: '/courses', label: 'Browse' },
    { href: '/my-courses', label: 'My Courses' },
    { href: '/blog', label: 'Blog' },
  ],
};

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
              Learning Management System
            </Link>
            <nav className="flex items-center gap-1">
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
