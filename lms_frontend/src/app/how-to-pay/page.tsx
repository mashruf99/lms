'use client';

import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';

// TODO: replace with your real mobile banking numbers
const PAYMENT_NUMBERS: Record<string, string> = {
  bkash: '01789735208',
  nagad: '01789735208',
  rocket: '017897352089',
};

const SUBSCRIPTION_PRICE = 99;

type Method = {
  key: 'bkash' | 'nagad' | 'rocket';
  label: string;
  steps: string[];
};

const METHODS: Method[] = [
  {
    key: 'bkash',
    label: 'bKash',
    steps: [
      'Open the bKash app on your phone and log in.',
      'Tap **Send Money**.',
      `Enter the number **${PAYMENT_NUMBERS.bkash}** and tap Next.`,
      `Enter **${SUBSCRIPTION_PRICE}৳** as the amount and tap Next.`,
      'Enter your bKash PIN and confirm.',
      'Copy the **Transaction ID** from the confirmation SMS.',
    ],
  },
  {
    key: 'nagad',
    label: 'Nagad',
    steps: [
      'Open the Nagad app on your phone and log in.',
      'Tap **Send Money**.',
      `Enter the number **${PAYMENT_NUMBERS.nagad}** and tap Next.`,
      `Enter **${SUBSCRIPTION_PRICE}৳** as the amount and tap Next.`,
      'Enter your Nagad PIN and confirm.',
      'Copy the **Transaction ID** from the confirmation SMS.',
    ],
  },
  {
    key: 'rocket',
    label: 'Rocket',
    steps: [
      'Open the Rocket app on your phone and log in.',
      'Tap **Send Money**.',
      `Enter the number **${PAYMENT_NUMBERS.rocket}** and tap Next.`,
      `Enter **${SUBSCRIPTION_PRICE}৳** as the amount and tap Next.`,
      'Enter your Rocket PIN and confirm.',
      'Copy the **Transaction ID** from the confirmation SMS.',
    ],
  },
];

// Minimal markdown renderer for **bold** only
function renderLine(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function HowToPayPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            How to pay
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            {SUBSCRIPTION_PRICE}৳ per month for unlimited access to all MCQ and CQ practice.
            Pay via bKash, Nagad, or Rocket, then sign up with your transaction ID.
          </p>
        </div>

        {/* Quick summary box */}
        <div className="mb-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            At a glance
          </h2>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
            <li>• Amount: <strong>{SUBSCRIPTION_PRICE}৳</strong> (one month)</li>
            <li>• Send to any one of the numbers below</li>
            <li>• Copy the <strong>Transaction ID</strong> from your confirmation SMS</li>
            <li>• Fill the <Link href="/signup" className="underline text-gray-900 dark:text-gray-100">signup form</Link> with that Transaction ID</li>
            <li>• We verify manually — usually within 24 hours</li>
          </ul>
        </div>

        {/* Per-method instructions */}
        <div className="space-y-6">
          {METHODS.map((m) => (
            <div
              key={m.key}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {m.label}
                </h2>
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                  {PAYMENT_NUMBERS[m.key]}
                </span>
              </div>

              <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
                {m.steps.map((step, i) => (
                  <li key={i} className="leading-relaxed">
                    {renderLine(step)}
                  </li>
                ))}
              </ol>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href="/signup"
                  className="inline-block text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-4 py-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  I've paid — sign up
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / notes */}
        <div className="mt-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Common questions
          </h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">
                What if I accidentally send the wrong amount?
              </dt>
              <dd className="text-gray-600 dark:text-gray-400 mt-1">
                Contact support with your Transaction ID. We'll sort it out manually.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">
                How long does approval take?
              </dt>
              <dd className="text-gray-600 dark:text-gray-400 mt-1">
                Usually within 24 hours. You'll be able to log in as soon as we verify your payment.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">
                Can I pay for multiple months at once?
              </dt>
              <dd className="text-gray-600 dark:text-gray-400 mt-1">
                Not yet — one month at a time for now. Renewals stack: paying early adds 30 days on top of your current expiry.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">
                I already have an account and my subscription expired. How do I renew?
              </dt>
              <dd className="text-gray-600 dark:text-gray-400 mt-1">
                Log in and go to the <strong>Renew</strong> page in your dashboard, or follow the same steps above and submit the new Transaction ID there.
              </dd>
            </div>
          </dl>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/signup"
            className="inline-block px-6 py-2.5 rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
          >
            Get started — {SUBSCRIPTION_PRICE}৳/month
          </Link>
        </div>
      </main>
    </div>
  );
}
