'use client';

import { useState } from 'react';
import Link from 'next/link';
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute';
import PublicHeader from '@/components/layout/PublicHeader';

// TODO: replace with your real mobile banking numbers
const PAYMENT_NUMBERS: Record<string, string> = {
  bkash: '01XXXXXXXXX',
  nagad: '01XXXXXXXXX',
  rocket: '01XXXXXXXXX',
};

const SUBSCRIPTION_PRICE = 99;

type PaymentMethod = 'bkash' | 'nagad' | 'rocket';

function SignupForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/proxy/payments/register-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          paymentMethod,
          senderNumber,
          transactionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // ─── Success screen ─────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
        <PublicHeader />

        <div className="flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 text-center">
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
              Account created
            </h1>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Your payment is pending verification. Once an admin approves it,
              you will be able to log in and start practicing.
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-500 mb-6">
              Usually verified within 24 hours.
            </p>

            <Link
              href="/login"
              className="inline-block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-5 py-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm text-sm"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Signup form ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <PublicHeader />

      <div className="py-10 px-4">
        <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-gray-100">
            Sign up for {SUBSCRIPTION_PRICE}৳/month
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Two steps: send the payment, then fill this form with your transaction ID.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Step 1 — Payment instructions */}
            <fieldset className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <legend className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Step 1 — Send {SUBSCRIPTION_PRICE}৳ via mobile banking
              </legend>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Send <strong>{SUBSCRIPTION_PRICE}৳</strong> to the number for your chosen method.
                Copy the <strong>Transaction ID</strong> from the confirmation SMS.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Need step-by-step instructions?{' '}
                <Link
                  href="/how-to-pay"
                  className="underline font-medium text-red-600 dark:text-red-400"
                >
                  See how to pay
                </Link>
              </p>

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

            {/* Step 2 — Account details */}
            <fieldset className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <legend className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Step 2 — Your account details
              </legend>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 dark:focus:border-gray-600 transition-shadow"
                  />
                </div>

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
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 dark:focus:border-gray-600 transition-shadow"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    At least 6 characters.
                  </p>
                </div>
              </div>
            </fieldset>

            {/* Step 3 — Payment confirmation */}
            <fieldset className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <legend className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Step 3 — Confirm your payment
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

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-4 py-2.5 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Creating account…' : `Create account — ${SUBSCRIPTION_PRICE}৳`}
            </button>
          </form>

          <p className="text-sm mt-4 text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="underline text-gray-900 dark:text-gray-100">
              Log in
            </Link>
          </p>
        </div>
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
