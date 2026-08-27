'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';
import { VideoEmbed } from '@/lib/media';

type Lesson = {
  id: number;
  documentId: string;
  title: string;
  videoUrl?: string;
  imageUrl?: string;
  order?: number;
  content?: any;
};

function extractText(blocks: any): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .map((block) => (block.children ?? []).map((c: any) => c.text ?? '').join(''))
    .join('\n');
}

function LessonDetailContent() {
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const loadData = async () => {
    setLoading(true);

    const lessonRes = await apiFetch(`/lessons/${lessonId}`);
    const lessonData = await lessonRes.json();
    setLesson(lessonData.data ?? null);

    const progressRes = await apiFetch('/my-progress');
    const progressData = await progressRes.json();
    const record = (progressData.data ?? []).find(
      (p: any) => String(p.lesson?.id) === String(lessonData.data?.id) && p.completed
    );
    setIsCompleted(!!record);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [lessonId]);

  const handleMarkComplete = async () => {
    setMarking(true);
    await apiFetch('/mark-complete', {
      method: 'POST',
      body: JSON.stringify({ lessonId: lesson?.id }),
    });
    await loadData();
    setMarking(false);
  };

  if (loading) return <p className="p-8">Loading...</p>;
  if (!lesson) return <p className="p-8">Lesson not found.</p>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <a href={`/my-courses/${courseId}`} className="text-sm underline mb-4 inline-block text-gray-600">
        ← Back to course
      </a>

      <h1 className="text-2xl font-semibold mb-4 text-gray-900">
        {lesson.order != null && `${lesson.order}. `}
        {lesson.title}
      </h1>

      {lesson.videoUrl && (
        <div className="mb-6">
          <VideoEmbed url={lesson.videoUrl} />
        </div>
      )}

      {lesson.imageUrl && (
        <div className="mb-6">
          <img
            src={lesson.imageUrl}
            alt={lesson.title}
            className="w-full rounded-lg border border-gray-200"
          />
        </div>
      )}

      {lesson.content && (
        <p className="whitespace-pre-wrap text-gray-800 mb-8">{extractText(lesson.content)}</p>
      )}

      {isCompleted ? (
        <span className="text-green-600 text-sm font-medium">✓ Completed</span>
      ) : (
        <button
          onClick={handleMarkComplete}
          disabled={marking}
          className="bg-gray-900 text-white rounded-md px-4 py-2 text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          {marking ? 'Saving...' : 'Mark as Complete'}
        </button>
      )}
    </div>
  );
}

export default function LessonDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <LessonDetailContent />
      </AppShell>
    </ProtectedRoute>
  );
}
