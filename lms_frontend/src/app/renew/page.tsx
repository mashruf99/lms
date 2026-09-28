'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

const PAYMENT_NUMBERS: Record<string, string> = {
  bkash: '01XXXXXXXXX',
  nagad: '01XXXXXXXXX',
  rocket: '01XXXXXXXXX',
};

const SUBSCRIPTION_PRICE = 99;
const DAYS_PER_CYCLE = 30;

type PaymentMethod = 'bkash' | 'nagad' | 'rocket';

function RenewContent() {
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Compute subscription status
  const expiry = user?.accessExpiresAt ? new Date(user.accessExpiresAt) : null;
  const now = new Date();
  const isExpired = !expiry || expiry <= now;
  const daysLeft = expiry
    ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch('/payments/renew', {
        method: 'POST',
        body: JSON.stringify({ paymentMethod, senderNumber, transactionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit renewal.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // ─── Success screen ───
  if (submitted) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 text-center">
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
            Renewal submitted
          </h1>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Your payment is pending verification. Once approved, your subscription
            will be extended by {DAYS_PER_CYCLE} days.
          </p>

          <Link
            href="/dashboard"
            className="inline-block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-5 py-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm text-sm"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─── Renewal form ───
  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-gray-100">
        Renew subscription
      </h1>

      {/* Status banner */}
      <div
        className={`mb-6 px-4 py-3 rounded-md border text-sm ${
          isExpired
            ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300'
            : daysLeft <= 7
            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
            : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-300'
        }`}
      >
        {isExpired ? (
          <>
            <strong>Your subscription has expired.</strong> Renew to continue
            practicing.
          </>
        ) : (
          <>
            <strong>{daysLeft} days remaining.</strong> Renewing early adds{' '}
            {DAYS_PER_CYCLE} days on top of your current expiry — no days lost.
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Step 1 — Send payment */}
        <fieldset className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <legend className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Step 1 — Send {SUBSCRIPTION_PRICE}৳ via mobile banking
          </legend>

          <div className="flex flex-col gap-2">
            {(['bkash', 'nagad', 'rocket'] as PaymentMethod[]).map((m) => (
              <label
                key={m}
                className={`flex items-center justify-between border rounded-md px-3 py-2 cursor-pointer transition-colors ${
                  paymentMethod === m
                    ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800/60'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m}
                    checked={paymentMethod === m}
                    onChange={() => setPaymentMethod(m)}
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200 capitalize">
                    {m}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                  {PAYMENT_NUMBERS[m]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Step 2 — Confirm */}
        <fieldset className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <legend className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Step 2 — Confirm your payment
          </legend>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Sender number
              </label>
              <input
                type="tel"
                required
                inputMode="numeric"
                pattern="01[3-9][0-9]{8}"
                placeholder="01XXXXXXXXX"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 dark:focus:border-gray-600 transition-shadow font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                The 11-digit number you sent the money <em>from</em>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Transaction ID
              </label>
              <input
                type="text"
                required
                minLength={5}
                placeholder="e.g. 9F2A1B4C7D"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 dark:focus:border-gray-600 transition-shadow font-mono uppercase"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                The Transaction ID from your {paymentMethod} confirmation SMS.
              </p>
            </div>
          </div>
        </fieldset>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-4 py-2.5 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Submitting…' : `Submit renewal — ${SUBSCRIPTION_PRICE}৳`}
        </button>
      </form>
    </div>
  );
}

export default function RenewPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <RenewContent />
      </AppShell>
    </ProtectedRoute>
  );
}
