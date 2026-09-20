'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type McqQuestion = { id: number; text: string; options: string[]; citation?: string | null };
type CqQuestion = { id: number; text: string; marks?: number; citation?: string | null };

type StartedSession = {
  attemptId: string;
  type: 'mcq' | 'cq';
  topicName: string;
  questions: (McqQuestion | CqQuestion)[];
  timeLimitSeconds: number;
};

function SessionContent() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [session, setSession] = useState<StartedSession | null>(null);
  const [index, setIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [cqAnswers, setCqAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const submittedRef = useRef(false);

  // Session data is passed via sessionStorage from the starting page
  // (attemptId in URL, question payload cached client-side since /practice/start already returned it)
  useEffect(() => {
    const cached = sessionStorage.getItem(`practice-session-${attemptId}`);
    if (cached) {
      const parsed: StartedSession = JSON.parse(cached);
      setSession(parsed);
      setSecondsLeft(parsed.timeLimitSeconds);
    }
    setLoading(false);
  }, [attemptId]);

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current || !session) return;
    submittedRef.current = true;
    setSubmitting(true);

    const answers = session.type === 'mcq' ? mcqAnswers : cqAnswers;

    await apiFetch('/practice/submit', {
      method: 'POST',
      body: JSON.stringify({ attemptId, answers }),
    });

    sessionStorage.removeItem(`practice-session-${attemptId}`);
    router.push(`/practice/review/${attemptId}`);
  }, [attemptId, session, mcqAnswers, cqAnswers, router]);

  const handleSubmitClick = () => {
    if (!session) return;
    const answers = session.type === 'mcq' ? mcqAnswers : cqAnswers;
    const answeredCount = Object.keys(answers).length;
    const total = session.questions.length;

    if (answeredCount < total) {
      const confirmed = confirm(
        `You've answered ${answeredCount} of ${total} questions. Submit anyway?`
      );
      if (!confirmed) return;
    }

    handleSubmit();
  };

  // Countdown timer
  useEffect(() => {
    if (!session || submittedRef.current) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, session, handleSubmit]);

  if (loading) return <p className="p-8">Loading...</p>;

  if (!session) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Session data not found. Please start a new practice session.
        </p>
        <a href="/practice" className="underline text-sm">
          ← Back to Practice
        </a>
      </div>
    );
  }

  const current = session.questions[index];
  const total = session.questions.length;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeUrgent = secondsLeft <= 30;

  const goNext = () => setIndex((i) => Math.min(i + 1, total - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{session.topicName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Question {index + 1} of {total}
          </p>
        </div>
        <div
          className={`text-lg font-mono font-semibold px-4 py-2 rounded-full ${
            timeUrgent ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
          }`}
        >
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{current.text}</p>
        {current.citation && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Source: {current.citation}</p>
        )}

        {session.type === 'mcq' ? (
          <div className="flex flex-col gap-2">
            {(current as McqQuestion).options.map((opt, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 border rounded-lg px-4 py-2 cursor-pointer transition-colors ${
                  mcqAnswers[current.id] === i
                    ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800/50'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${current.id}`}
                  checked={mcqAnswers[current.id] === i}
                  onChange={() => setMcqAnswers((prev) => ({ ...prev, [current.id]: i }))}
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{opt}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            value={cqAnswers[current.id] ?? ''}
            onChange={(e) => setCqAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
            placeholder="Write your answer..."
            rows={8}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm"
          />
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex gap-1">
          {session.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full ${i === index ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {index < total - 1 && (
            <button
              onClick={goNext}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              Next
            </button>
          )}
          <button
            onClick={handleSubmitClick}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <SessionContent />
      </AppShell>
    </ProtectedRoute>
  );
}
