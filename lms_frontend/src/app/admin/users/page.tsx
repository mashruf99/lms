'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Role = { id: number; name: string };
type User = { id: number; username: string; email: string; role: Role | null };

type Stats = {
  usersByRole: Record<string, number>;
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalLessons: number;
  totalQuizzes: number;
  totalBlogPosts: number;
};

const AVAILABLE_ROLES = ['Admin', 'Content Manager', 'Instructor', 'Student', 'Authenticated'];

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border rounded px-4 py-3 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function UsersPageContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadUsers = async () => {
    const res = await apiFetch('/users?populate=role');
    const data = await res.json();
    setUsers(data);
  };

  const loadRoles = async () => {
    const res = await apiFetch('/users-permissions/roles');
    const data = await res.json();
    setRoles(data.roles ?? []);
  };

  const loadStats = async () => {
    const res = await apiFetch('/stats/overview');
    const data = await res.json();
    setStats(data.data ?? null);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadRoles(), loadStats()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRoleChange = async (userId: number, newRoleId: number) => {
    setSavingId(userId);
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRoleId }),
    });
    await loadAll();
    setSavingId(null);
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

      {stats && (
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-3">Platform Stats</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Courses" value={stats.totalCourses} />
            <StatCard label="Enrollments" value={stats.totalEnrollments} />
            <StatCard label="Lessons" value={stats.totalLessons} />
            <StatCard label="Quizzes" value={stats.totalQuizzes} />
            <StatCard label="Blog Posts" value={stats.totalBlogPosts} />
          </div>
          <div className="border rounded p-4">
            <p className="text-sm font-medium mb-2">Users by Role</p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <span key={role}>
                  {role}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <h2 className="text-lg font-medium mb-3">Manage Users</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Username</th>
            <th className="py-2">Email</th>
            <th className="py-2">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.username}</td>
              <td className="py-2">{u.email}</td>
              <td className="py-2">
                <select
                  value={roles.find((r) => r.name === u.role?.name)?.id ?? ''}
                  disabled={savingId === u.id}
                  onChange={(e) => handleRoleChange(u.id, Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  {roles
                    .filter((r) => AVAILABLE_ROLES.includes(r.name))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <AppShell>
        <UsersPageContent />
      </AppShell>
    </ProtectedRoute>
  );
}
