'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { apiFetch } from '@/lib/api';

type Course = { id: number; documentId: string; title: string; owner?: { id: number; username: string } };

function ManageCoursesContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadCourses = async () => {
    setLoading(true);
    const res = await apiFetch('/courses?populate=owner');
    const data = await res.json();
    setCourses(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    const res = await apiFetch('/courses', {
      method: 'POST',
      body: JSON.stringify({ data: { title } }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Failed to create course');
      setCreating(false);
      return;
    }

    setTitle('');
    setCreating(false);
    await loadCourses();
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    await apiFetch(`/courses/${documentId}`, { method: 'DELETE' });
    await loadCourses();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Manage Courses</h1>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          type="text"
          required
          placeholder="New course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : courses.length === 0 ? (
        <p className="text-gray-500">No courses yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {courses.map((course) => (
            <li key={course.id} className="border rounded px-4 py-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{course.title}</p>
                {course.owner && (
                  <p className="text-sm text-gray-500">Owner: {course.owner.username}</p>
                )}
              </div>
              <div className="flex gap-3">
                <Link href={`/courses/manage/${course.documentId}`} className="text-sm underline">
                  Manage Lessons
                </Link>
                <button
                  onClick={() => handleDelete(course.documentId)}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ManageCoursesPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'Content Manager', 'Instructor']}>
      <ManageCoursesContent />
    </ProtectedRoute>
  );
}
