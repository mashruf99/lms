'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Lesson = {
  id: number;
  documentId: string;
  title: string;
  videoUrl?: string;
  imageUrl?: string;
  order?: number;
  content?: any;
};
type Course = { id: number; documentId: string; title: string };

function extractText(blocks: any): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .map((block) => (block.children ?? []).map((c: any) => c.text ?? '').join(''))
    .join('\n');
}

function toBlocks(text: string) {
  if (!text) return null;
  return [{ type: 'paragraph', children: [{ type: 'text', text }] }];
}

function ManageLessonsContent() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [order, setOrder] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editOrder, setEditOrder] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);

    const courseRes = await apiFetch(`/courses/${courseId}`);
    const courseData = await courseRes.json();
    setCourse(courseData.data ?? null);

    const lessonsRes = await apiFetch(`/lessons?filters[course][documentId][$eq]=${courseId}&sort=order:asc`);
    const lessonsData = await lessonsRes.json();
    setLessons(lessonsData.data ?? []);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    const res = await apiFetch('/lessons', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title,
          content: toBlocks(content),
          videoUrl: videoUrl || null,
          imageUrl: imageUrl || null,
          order: order ? Number(order) : null,
          course: courseId,
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Failed to create lesson');
      setCreating(false);
      return;
    }

    setTitle('');
    setContent('');
    setVideoUrl('');
    setImageUrl('');
    setOrder('');
    setCreating(false);
    await loadData();
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this lesson?')) return;
    await apiFetch(`/lessons/${documentId}`, { method: 'DELETE' });
    await loadData();
  };

  const startEdit = (lesson: Lesson) => {
    setEditingId(lesson.documentId);
    setEditTitle(lesson.title);
    setEditContent(extractText(lesson.content));
    setEditVideoUrl(lesson.videoUrl ?? '');
    setEditImageUrl(lesson.imageUrl ?? '');
    setEditOrder(lesson.order != null ? String(lesson.order) : '');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (documentId: string) => {
    setSaving(true);
    const res = await apiFetch(`/lessons/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          title: editTitle,
          content: toBlocks(editContent),
          videoUrl: editVideoUrl || null,
          imageUrl: editImageUrl || null,
          order: editOrder ? Number(editOrder) : null,
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error?.message || 'Failed to update lesson');
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditingId(null);
    await loadData();
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <a href="/courses/manage" className="text-sm underline mb-4 inline-block text-gray-600">
        ← Back to Courses
      </a>
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">
        Lessons — {course?.title ?? 'Course'}
      </h1>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <input
          type="text"
          required
          placeholder="Lesson title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <textarea
          placeholder="Lesson content (text)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
          rows={3}
        />
        <input
          type="text"
          placeholder="Video URL (YouTube link or direct .mp4 link, optional)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <input
          type="text"
          placeholder="Image URL (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <input
          type="number"
          placeholder="Order (e.g. 1, 2, 3)"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-gray-900 text-white rounded-md px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-50 self-start shadow-sm"
        >
          {creating ? 'Adding...' : 'Add Lesson'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {lessons.length === 0 ? (
        <p className="text-gray-500">No lessons yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lessons.map((lesson) =>
            editingId === lesson.documentId ? (
              <li key={lesson.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
                <input
                  type="text"
                  placeholder="Video URL"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Order"
                  value={editOrder}
                  onChange={(e) => setEditOrder(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => saveEdit(lesson.documentId)}
                    disabled={saving}
                    className="bg-gray-900 text-white rounded-md px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={cancelEdit} className="underline text-gray-600">
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li key={lesson.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {lesson.order != null && `${lesson.order}. `}
                    {lesson.title}
                  </p>
                  {lesson.content && (
                    <p className="text-sm text-gray-600 mt-1">{extractText(lesson.content)}</p>
                  )}
                  {lesson.videoUrl && (
                    <p className="text-xs text-gray-500 mt-1">🎬 {lesson.videoUrl}</p>
                  )}
                  {lesson.imageUrl && (
                    <p className="text-xs text-gray-500 mt-1">🖼 {lesson.imageUrl}</p>
                  )}
                </div>
                <div className="flex gap-3 shrink-0 ml-4">
                  <button onClick={() => startEdit(lesson)} className="text-sm underline text-gray-700">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(lesson.documentId)}
                    className="text-sm text-red-600 underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

export default function ManageLessonsPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'Content Manager', 'Instructor']}>
      <AppShell>
        <ManageLessonsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
