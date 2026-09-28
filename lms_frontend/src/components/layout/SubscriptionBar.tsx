'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default function SubscriptionBar() {
  const { user, role, refetch } = useAuth();
  const pathname = usePathname();
  const lastFetchRef = useRef<number>(0);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (now - lastFetchRef.current < 30_000) return;
    lastFetchRef.current = now;
    void refetch();
  }, [pathname, refetch]);

  // Load dismissal state whenever the user / expiry changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user || role !== 'Student' || user.approvalStatus !== 'approved') {
      setDismissedKey(null);
      return;
    }

    const expiry = user.accessExpiresAt ? new Date(user.accessExpiresAt) : null;
    const daysLeft = expiry
      ? Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    // Only green (>7 days) and amber-expiring (1–7 days) states are dismissible.
    // Red, no-subscription, and null-expiry states have no dismiss key.
    let key: string | null = null;
    if (expiry && daysLeft !== null && daysLeft > 7) {
      key = `sb:green:${user.accessExpiresAt}`;
    } else if (expiry && daysLeft !== null && daysLeft > 0) {
      key = `sb:amber:${user.accessExpiresAt}`;
    }

    if (!key) {
      setDismissedKey(null);
      return;
    }

    const stored = sessionStorage.getItem(key);
    setDismissedKey(stored === '1' ? key : null);
  }, [user, role]);

  if (!user || role !== 'Student') return null;
  if (user.approvalStatus !== 'approved') return null;

  const expiry = user.accessExpiresAt ? new Date(user.accessExpiresAt) : null;

  // ─── No expiry on file — NOT dismissible ───────────────
  if (!expiry) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between gap-4 text-sm text-amber-800 dark:text-amber-300">
          <span>No active subscription on file.</span>
          <Link
            href="/renew"
            className="underline font-medium text-amber-900 dark:text-amber-200"
          >
            Renew
          </Link>
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // ─── Expired — NOT dismissible ─────────────────────────
  if (daysLeft <= 0) {
    return (
      <div className="border-b border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between gap-4 text-sm text-red-800 dark:text-red-300">
          <span>
            <strong>Subscription expired.</strong> Renew to continue practicing.
          </span>
          <Link
            href="/renew"
            className="underline font-medium text-red-900 dark:text-red-200"
          >
            Renew now
          </Link>
        </div>
      </div>
    );
  }

  // ─── Expiring soon (≤ 7 days) — dismissible ────────────
  if (daysLeft <= 7) {
    const key = `sb:amber:${user.accessExpiresAt}`;
    if (dismissedKey === key) return null;

    const handleDismiss = () => {
      sessionStorage.setItem(key, '1');
      setDismissedKey(key);
    };

    return (
      <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between gap-4 text-sm text-amber-800 dark:text-amber-300">
          <span>
            <strong>
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining
            </strong>
            {' '}— renews on {formatDate(user.accessExpiresAt!)}
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/renew"
              className="underline font-medium text-amber-900 dark:text-amber-200"
            >
              Renew
            </Link>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              title="Dismiss for this session"
              className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Healthy (> 7 days) — dismissible ──────────────────
  const key = `sb:green:${user.accessExpiresAt}`;
  if (dismissedKey === key) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(key, '1');
    setDismissedKey(key);
  };

  return (
    <div className="border-b border-green-200/60 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/5">
      <div className="max-w-6xl mx-auto px-6 py-1.5 flex items-center justify-between gap-4 text-xs text-green-800 dark:text-green-300">
        <span>
          {daysLeft} days remaining — renews {formatDate(user.accessExpiresAt!)}
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/renew"
            className="underline text-green-900 dark:text-green-200"
          >
            Renew early
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            title="Dismiss for this session"
            className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
