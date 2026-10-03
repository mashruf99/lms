'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import SubscriptionBar from './SubscriptionBar';

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
    { href: '/renew', label: 'Renew' },
    { href: '/blog', label: 'Blog' },
  ],
};

const navBase = 'px-3 py-1.5 rounded-md text-sm transition-colors inline-block';
const navIdle =
  'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white';
const navActive = 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white';

// Mobile menu link styles
const mobileLink =
  'block px-3 py-2.5 rounded-md text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors';
const mobileLinkActive = 'block px-3 py-2.5 rounded-md text-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white';
const mobileLinkSub =
  'block px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function StartPracticingDropdown({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/practice"
        className={`${navBase} ${active ? navActive : navIdle}`}
      >
        Start Practicing
      </Link>

      {open && (
        <div className="absolute top-full left-0 min-w-[140px] z-20 py-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/40">
          <Link
            href="/practice/mcq"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            MCQ
          </Link>
          <Link
            href="/practice/cq"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const links = role ? NAV_BY_ROLE[role] ?? [] : [];

  const activeHref = links
    .filter((l) => pathname === l.href || pathname.startsWith(l.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left: brand + desktop nav */}
          <div className="flex items-center gap-8 min-w-0">
            <Link
              href="/dashboard"
              className="font-semibold text-gray-900 dark:text-white whitespace-nowrap"
            >
              MCQ Practice
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {role === 'Student' && (
                <StartPracticingDropdown active={pathname.startsWith('/practice')} />
              )}
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${navBase} ${link.href === activeHref ? navActive : navIdle}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: desktop controls + mobile hamburger */}
          <div className="flex items-center gap-2">
            {/* Desktop controls */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-900 dark:text-gray-100 leading-tight">
                  {user?.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                  {role}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-400 text-white rounded-md text-sm border border-red-300 hover:bg-red-600 hover:border-red-400 dark:bg-red-500/90 dark:border-red-400/40 dark:hover:bg-red-500 transition-colors"
              >
                Log out
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
              {role === 'Student' && (
                <>
                  <Link
                    href="/practice"
                    className={`${mobileLink} font-medium`}
                  >
                    Start Practicing
                  </Link>
                  <Link href="/practice/mcq" className={`${mobileLinkSub} pl-6`}>
                    MCQ
                  </Link>
                  <Link href="/practice/cq" className={`${mobileLinkSub} pl-6`}>
                    CQ
                  </Link>
                </>
              )}
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={link.href === activeHref ? mobileLinkActive : mobileLink}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile: theme + user + logout */}
            <div className="max-w-6xl mx-auto px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                    {role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-400 text-white rounded-md text-sm border border-red-300 hover:bg-red-600 hover:border-red-400 dark:bg-red-500/90 dark:border-red-400/40 dark:hover:bg-red-500 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </header>

      <SubscriptionBar />

      <main>{children}</main>
    </div>
  );
}
