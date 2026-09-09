'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Question = {
  id: number;
  documentId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
};

type Quiz = {
  id: number;
  documentId: string;
  title: string;
};

function ManageQuizContent() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<{ title: string } | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [quizTitle, setQuizTitle] = useState('');
  const [creatingQuiz, setCreatingQuiz] = useState(false);

  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);

    const courseRes = await apiFetch(`/courses/${courseId}`);
    const courseData = await courseRes.json();
    setCourse(courseData.data ?? null);

    const quizRes = await apiFetch(
      `/quizzes?filters[course][documentId][$eq]=${courseId}`
    );
    const quizData = await quizRes.json();
    const existingQuiz = quizData.data?.[0] ?? null;
    setQuiz(existingQuiz);

    if (existingQuiz) {
      const qRes = await apiFetch(
        `/questions?filters[quiz][documentId][$eq]=${existingQuiz.documentId}`
      );
      const qData = await qRes.json();
      setQuestions(qData.data ?? []);
    } else {
      setQuestions([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingQuiz(true);
    setError('');

    const res = await apiFetch('/quizzes', {
      method: 'POST',
      body: JSON.stringify({ data: { title: quizTitle, course: courseId } }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Failed to create quiz');
      setCreatingQuiz(false);
      return;
    }

    setQuizTitle('');
    setCreatingQuiz(false);
    await loadData();
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingQuestion(true);
    setError('');

    const filledOptions = qOptions.filter((o) => o.trim() !== '');

    if (filledOptions.length < 2) {
      setError('Provide at least 2 options');
      setAddingQuestion(false);
      return;
    }

    const res = await apiFetch('/questions', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          text: qText,
          options: filledOptions,
          correctOptionIndex: qCorrect,
          quiz: quiz?.documentId,
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Failed to add question');
      setAddingQuestion(false);
      return;
    }

    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrect(0);
    setAddingQuestion(false);
    await loadData();
  };

  const handleDeleteQuestion = async (documentId: string) => {
    if (!confirm('Delete this question?')) return;
    await apiFetch(`/questions/${documentId}`, { method: 'DELETE' });
    await loadData();
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <a href="/courses/manage" className="text-sm underline mb-4 inline-block">
        ← Back to Courses
      </a>
      <h1 className="text-2xl font-semibold mb-6">Quiz — {course?.title}</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!quiz ? (
        <form onSubmit={handleCreateQuiz} className="flex gap-2 mb-8">
          <input
            type="text"
            required
            placeholder="Quiz title"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            type="submit"
            disabled={creatingQuiz}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {creatingQuiz ? 'Creating...' : 'Create Quiz'}
          </button>
        </form>
      ) : (
        <>
          <h2 className="text-lg font-medium mb-4">{quiz.title}</h2>

          <form onSubmit={handleAddQuestion} className="flex flex-col gap-3 mb-8 border rounded p-4">
            <input
              type="text"
              required
              placeholder="Question text"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="border rounded px-3 py-2"
            />
            {qOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={qCorrect === i}
                  onChange={() => setQCorrect(i)}
                />
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const next = [...qOptions];
                    next[i] = e.target.value;
                    setQOptions(next);
                  }}
                  className="flex-1 border rounded px-3 py-2"
                />
              </div>
            ))}
            <p className="text-xs text-gray-500">Select the radio button next to the correct answer.</p>
            <button
              type="submit"
              disabled={addingQuestion}
              className="bg-black text-white rounded px-4 py-2 disabled:opacity-50 self-start"
            >
              {addingQuestion ? 'Adding...' : 'Add Question'}
            </button>
          </form>

          {questions.length === 0 ? (
            <p className="text-gray-500">No questions yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {questions.map((q, idx) => (
                <li key={q.id} className="border rounded px-4 py-3">
                  <div className="flex justify-between items-start">
                    <p className="font-medium">
                      {idx + 1}. {q.text}
                    </p>
                    <button
                      onClick={() => handleDeleteQuestion(q.documentId)}
                      className="text-sm text-red-600 underline shrink-0 ml-4"
                    >
                      Delete
                    </button>
                  </div>
                  <ul className="mt-2 text-sm text-gray-600">
                    {q.options?.map((opt, i) => (
                      <li key={i} className={i === q.correctOptionIndex ? 'text-green-600 font-medium' : ''}>
                        {i === q.correctOptionIndex ? '✓ ' : '– '}
                        {opt}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function ManageQuizPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'Content Manager', 'Instructor']}>
      <AppShell>
        <ManageQuizContent />
      </AppShell>
    </ProtectedRoute>
  );
}
