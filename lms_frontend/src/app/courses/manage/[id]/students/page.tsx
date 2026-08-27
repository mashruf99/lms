'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type StudentProgress = {
  studentId: number;
  username: string;
  email: string;
  completedCount: number;
  totalLessons: number;
  percent: number;
};

function StudentProgressContent() {
  const params = useParams();
  const courseId = params.id as string;

  const [courseTitle, setCourseTitle] = useState('');
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await apiFetch(`/course-progress/${courseId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'You do not have access to this course\'s progress.');
        setLoading(false);
        return;
      }

      setCourseTitle(data.data?.courseTitle ?? '');
      setStudents(data.data?.students ?? []);
      setLoading(false);
    };
    load();
  }, [courseId]);

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <a href="/courses/manage" className="text-sm underline mb-4 inline-block text-gray-600">
        ← Back to Courses
      </a>
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">
        Student Progress — {courseTitle}
      </h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {students.length === 0 ? (
        <p className="text-gray-500">No students enrolled yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-2 px-4">Student</th>
                <th className="py-2 px-4">Email</th>
                <th className="py-2 px-4">Progress</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId} className="border-b last:border-0">
                  <td className="py-3 px-4">{s.username}</td>
                  <td className="py-3 px-4 text-gray-600">{s.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-900 h-2 rounded-full"
                          style={{ width: `${s.percent}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">
                        {s.completedCount}/{s.totalLessons} ({s.percent}%)
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function StudentProgressPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'Content Manager', 'Instructor']}>
      <AppShell>
        <StudentProgressContent />
      </AppShell>
    </ProtectedRoute>
  );
}
