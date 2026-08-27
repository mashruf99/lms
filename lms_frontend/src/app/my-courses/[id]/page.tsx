'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Lesson = {
  id: number;
  documentId: string;
  title: string;
  order?: number;
};

type Progress = {
  id: number;
  completed: boolean;
  lesson: { id: number };
};

function CourseViewerContent() {
  const params = useParams();
  const courseId = params.id as string;

  const [courseTitle, setCourseTitle] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

    const courseRes = await apiFetch(`/courses/${courseId}`);
    const courseData = await courseRes.json();
    setCourseTitle(courseData.data?.title ?? '');

    const lessonsRes = await apiFetch(
      `/lessons?filters[course][documentId][$eq]=${courseId}&sort=order:asc`
    );
    const lessonsData = await lessonsRes.json();
    setLessons(lessonsData.data ?? []);

    const progressRes = await apiFetch('/my-progress');
    const progressData = await progressRes.json();
    setProgress(progressData.data ?? []);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const isCompleted = (lessonId: number) =>
    progress.some((p) => p.lesson?.id === lessonId && p.completed);

  if (loading) return <p className="p-8">Loading...</p>;

  const completedCount = lessons.filter((l) => isCompleted(l.id)).length;
  const totalCount = lessons.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/my-courses" className="text-sm underline mb-4 inline-block text-gray-600">
        ← Back to My Courses
      </Link>
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">{courseTitle}</h1>
        <Link href={`/my-courses/${courseId}/quiz`} className="text-sm underline text-gray-700">
          Take Quiz
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-1 text-gray-700">
          <span>
            Progress: {completedCount} of {totalCount} lessons
          </span>
          <span>{percent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gray-900 h-2 rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {lessons.length === 0 ? (
        <p className="text-gray-500">No lessons in this course yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/my-courses/${courseId}/lessons/${lesson.documentId}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-gray-900">
                  {lesson.order != null && `${lesson.order}. `}
                  {lesson.title}
                </span>
                {isCompleted(lesson.id) && (
                  <span className="text-green-600 text-sm font-medium">✓ Completed</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CourseViewerPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <CourseViewerContent />
      </AppShell>
    </ProtectedRoute>
  );
}
