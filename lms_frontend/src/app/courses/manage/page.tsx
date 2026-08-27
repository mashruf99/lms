'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Course = { id: number; documentId: string; title: string; owner?: { id: number; username: string } };

function ManageCoursesContent() {
  const { user, role } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/courses?populate=owner');
    const data = await res.json();
    let list: Course[] = data.data ?? [];

    if (role === 'Instructor') {
      list = list.filter((c) => c.owner?.id === user?.id);
    }

    setCourses(list);
    setLoading(false);
  }, [role, user]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      void loadCourses();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadCourses, user]);

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
    const res = await apiFetch(`/courses/${documentId}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('You are not allowed to delete this course.');
      return;
    }
    await loadCourses();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2 text-gray-900">Manage Courses</h1>
      {role === 'Instructor' && (
        <p className="text-sm text-gray-500 mb-6">Showing only courses you own.</p>
      )}

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          type="text"
          required
          placeholder="New course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-shadow"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-gray-900 text-white rounded-md px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm"
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
            <li
              key={course.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-gray-900">{course.title}</p>
                {course.owner && (
                  <p className="text-sm text-gray-500">Owner: {course.owner.username}</p>
                )}
              </div>
              <div className="flex gap-3">
                <Link href={`/courses/manage/${course.documentId}`} className="text-sm underline text-gray-700">
                  Manage Lessons
                </Link>
                <Link href={`/courses/manage/${course.documentId}/quiz`} className="text-sm underline text-gray-700">
                  Manage Quiz
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
      <AppShell>
        <ManageCoursesContent />
      </AppShell>
    </ProtectedRoute>
  );
}
