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
  videoUrl?: string;
  order?: number;
  content?: any;
};

type Progress = {
  id: number;
  completed: boolean;
  lesson: { id: number };
};

function extractText(blocks: any): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .map((block) => (block.children ?? []).map((c: any) => c.text ?? '').join(''))
    .join('\n');
}

function CourseViewerContent() {
  const params = useParams();
  const courseId = params.id as string;

  const [courseTitle, setCourseTitle] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const loadData = async () => {
    setLoading(true);

    const courseRes = await apiFetch(`/courses/${courseId}`);
    const courseData = await courseRes.json();
    setCourseTitle(courseData.data?.title ?? '');

    const lessonsRes = await apiFetch(
      `/lessons?filters[course][documentId][$eq]=${courseId}&sort=order:asc`
    );
    const lessonsData = await lessonsRes.json();
    const lessonList: Lesson[] = lessonsData.data ?? [];
    setLessons(lessonList);

    if (lessonList.length > 0 && activeLessonId === null) {
      setActiveLessonId(lessonList[0].id);
    }

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

  const handleMarkComplete = async (lessonId: number) => {
    setMarking(true);
    await apiFetch('/mark-complete', {
      method: 'POST',
      body: JSON.stringify({ lessonId }),
    });
    await loadData();
    setMarking(false);
  };

  if (loading) return <p className="p-8">Loading...</p>;

  const completedCount = lessons.filter((l) => isCompleted(l.id)).length;
  const totalCount = lessons.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const activeLesson = lessons.find((l) => l.id === activeLessonId);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-courses" className="text-sm underline mb-4 inline-block">
        ← Back to My Courses
      </Link>
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-semibold">{courseTitle}</h1>
        <a href={`/my-courses/${courseId}/quiz`} className="text-sm underline">
          Take Quiz
        </a>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>
            Progress: {completedCount} of {totalCount} lessons
          </span>
          <span>{percent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-black h-2 rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="w-56 shrink-0">
          <ul className="flex flex-col gap-1">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <button
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    activeLessonId === lesson.id ? 'bg-black text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {isCompleted(lesson.id) ? '✓ ' : ''}
                  {lesson.order != null && `${lesson.order}. `}
                  {lesson.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex-1">
          {activeLesson ? (
            <div>
              <h2 className="text-xl font-semibold mb-3">{activeLesson.title}</h2>
              {activeLesson.videoUrl && (
                <p className="text-sm text-gray-600 mb-3">
                  Video: {activeLesson.videoUrl}
                </p>
              )}
              <p className="whitespace-pre-wrap mb-6">{extractText(activeLesson.content)}</p>

              {isCompleted(activeLesson.id) ? (
                <span className="text-green-600 text-sm font-medium">✓ Completed</span>
              ) : (
                <button
                  onClick={() => handleMarkComplete(activeLesson.id)}
                  disabled={marking}
                  className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
                >
                  {marking ? 'Saving...' : 'Mark as Complete'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No lessons in this course yet.</p>
          )}
        </main>
      </div>
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
