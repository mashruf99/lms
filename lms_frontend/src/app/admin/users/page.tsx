'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Role = { id: number; name: string };
type User = {
  id: number;
  username: string;
  email: string;
  role: Role | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
};

type Stats = {
  usersByRole: Record<string, number>;
  usersByApproval: Record<string, number>;
  totalUsers: number;
  totalTopics: number;
  totalQuestions: number;
  totalUnansweredQuestions: number;
  totalAttempts: number;
  totalBlogPosts: number;
};

const AVAILABLE_ROLES = ['Admin', 'Student', 'Authenticated'];

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm text-center">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: User['approvalStatus'] }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

function UsersPageContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

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

  const handleApproval = async (userId: number, status: 'approved' | 'rejected') => {
    setSavingId(userId);
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ approvalStatus: status }),
    });
    await loadAll();
    setSavingId(null);
  };

  if (loading) return <p className="p-8">Loading...</p>;

  const pendingCount = users.filter((u) => u.approvalStatus === 'pending').length;
  const visibleUsers = filter === 'pending' ? users.filter((u) => u.approvalStatus === 'pending') : users;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">Admin Dashboard</h1>

      {stats && (
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-3 text-gray-900">Platform Stats</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Topics" value={stats.totalTopics} />
            <StatCard label="Questions" value={stats.totalQuestions} />
            <StatCard label="Unanswered" value={stats.totalUnansweredQuestions} />
            <StatCard label="Attempts" value={stats.totalAttempts} />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Manage Users
          {pendingCount > 0 && (
            <span className="ml-2 text-sm font-normal text-amber-600">
              ({pendingCount} pending approval)
            </span>
          )}
        </h2>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-md ${filter === 'pending' ? 'bg-gray-900 text-white' : 'border border-gray-300'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md ${filter === 'all' ? 'bg-gray-900 text-white' : 'border border-gray-300'}`}
          >
            All
          </button>
        </div>
      </div>

      {visibleUsers.length === 0 ? (
        <p className="text-gray-500">
          {filter === 'pending' ? 'No pending approvals.' : 'No users.'}
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-2 px-4">Username</th>
                <th className="py-2 px-4">Email</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Role</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2 px-4">{u.username}</td>
                  <td className="py-2 px-4 text-gray-600">{u.email}</td>
                  <td className="py-2 px-4">
                    <StatusBadge status={u.approvalStatus ?? 'pending'} />
                  </td>
                  <td className="py-2 px-4">
                    <select
                      value={roles.find((r) => r.name === u.role?.name)?.id ?? ''}
                      disabled={savingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, Number(e.target.value))}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
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
                  <td className="py-2 px-4">
                    {u.approvalStatus !== 'approved' && (
                      <button
                        onClick={() => handleApproval(u.id, 'approved')}
                        disabled={savingId === u.id}
                        className="text-xs text-green-700 underline mr-3 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    {u.approvalStatus !== 'rejected' && (
                      <button
                        onClick={() => handleApproval(u.id, 'rejected')}
                        disabled={savingId === u.id}
                        className="text-xs text-red-600 underline disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
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

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <AppShell>
        <UsersPageContent />
      </AppShell>
    </ProtectedRoute>
  );
}
