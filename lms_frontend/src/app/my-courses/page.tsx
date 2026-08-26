'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { apiFetch } from '@/lib/api';

type Enrollment = {
  id: number;
  documentId: string;
  course: {
    id: number;
    documentId: string;
    title: string;
  };
};

function MyCoursesContent() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEnrollments = async () => {
    setLoading(true);
    const res = await apiFetch('/my-enrollments');
    const data = await res.json();
    setEnrollments(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadEnrollments();
  }, []);

  if (loading) return <p className="p-8">Loading your courses...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">My Courses</h1>

      {enrollments.length === 0 ? (
        <div>
          <p className="text-gray-500 mb-4">You haven&apos;t enrolled in any courses yet.</p>
          <Link href="/courses" className="underline">
            Browse courses
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {enrollments.map((enrollment) => (
            <li key={enrollment.id} className="border rounded px-4 py-3">
              <div className="flex justify-between items-center">
                <p className="font-medium">{enrollment.course?.title}</p>
                <Link
                  href={`/my-courses/${enrollment.course?.documentId}`}
                  className="text-sm underline"
                >
                  View Course
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MyCoursesPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <MyCoursesContent />
    </ProtectedRoute>
  );
}
