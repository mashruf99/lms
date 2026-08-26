'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { apiFetch } from '@/lib/api';

type Question = {
  id: number;
  documentId: string;
  text: string;
  options: string[];
};

type Quiz = {
  id: number;
  documentId: string;
  title: string;
};

type Result = {
  score: number;
  correctCount: number;
  totalQuestions: number;
};

function TakeQuizContent() {
  const params = useParams();
  const courseId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);

    const quizRes = await apiFetch(
      `/quizzes?filters[course][documentId][$eq]=${courseId}`
    );
    const quizData = await quizRes.json();
    const foundQuiz = quizData.data?.[0] ?? null;
    setQuiz(foundQuiz);

    if (foundQuiz) {
      const qRes = await apiFetch(
        `/questions?filters[quiz][documentId][$eq]=${foundQuiz.documentId}`
      );
      const qData = await qRes.json();
      setQuestions(qData.data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const handleSelect = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    setError('');

    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);

    const res = await apiFetch('/submit-quiz', {
      method: 'POST',
      body: JSON.stringify({ quizId: quiz?.id, answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to submit quiz');
      setSubmitting(false);
      return;
    }

    setResult({
      score: data.data.score,
      correctCount: data.data.correctCount,
      totalQuestions: data.data.totalQuestions,
    });
    setSubmitting(false);
  };

  if (loading) return <p className="p-8">Loading...</p>;

  if (!quiz) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-gray-500">No quiz available for this course yet.</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Quiz Result</h1>
        <div className="border rounded p-6 text-center">
          <p className="text-4xl font-bold mb-2">{result.score}%</p>
          <p className="text-gray-600">
            {result.correctCount} of {result.totalQuestions} correct
          </p>
        </div>
        <a href={`/my-courses/${courseId}`} className="underline text-sm mt-4 inline-block">
          ← Back to course
        </a>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <a href={`/my-courses/${courseId}`} className="text-sm underline mb-4 inline-block">
        ← Back to course
      </a>
      <h1 className="text-2xl font-semibold mb-6">{quiz.title}</h1>

      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="border rounded p-4">
            <p className="font-medium mb-3">
              {idx + 1}. {q.text}
            </p>
            <div className="flex flex-col gap-2">
              {q.options?.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    checked={answers[q.id] === i}
                    onChange={() => handleSelect(q.id, i)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-black text-white rounded px-6 py-2 mt-6 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Quiz'}
      </button>
    </div>
  );
}

export default function TakeQuizPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <TakeQuizContent />
    </ProtectedRoute>
  );
}
