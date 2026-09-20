'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Course = { id: number; documentId: string; title: string };
type Enrollment = { id: number; course: { documentId: string } };

function BrowseCoursesContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    const coursesRes = await apiFetch('/courses');
    const coursesData = await coursesRes.json();
    setCourses(coursesData.data ?? []);

    const enrollRes = await apiFetch('/my-enrollments');
    const enrollData = await enrollRes.json();
    const ids = new Set<string>(
      (enrollData.data ?? []).map((e: Enrollment) => e.course?.documentId).filter(Boolean)
    );
    setEnrolledIds(ids);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);

    const res = await apiFetch('/enrollments', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          course: courseId,
          enrolledAt: new Date().toISOString(),
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error?.message || 'Failed to enroll');
      setEnrollingId(null);
      return;
    }

    setEnrollingId(null);
    await loadData();
  };

  if (loading) return <p className="p-8">Loading courses...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Browse Courses</h1>

      {courses.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No courses available yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {courses.map((course) => {
            const isEnrolled = enrolledIds.has(course.documentId);
            return (
              <li
                key={course.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm flex justify-between items-center"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100">{course.title}</p>
                {isEnrolled ? (
                  <span className="text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-full px-3 py-1">
                    ✓ Enrolled
                  </span>
                ) : (
                  <button
                    onClick={() => handleEnroll(course.documentId)}
                    disabled={enrollingId === course.documentId}
                    className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-4 py-2 text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {enrollingId === course.documentId ? 'Enrolling...' : 'Enroll'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function BrowseCoursesPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <BrowseCoursesContent />
      </AppShell>
    </ProtectedRoute>
  );
}
