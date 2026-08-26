'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { apiFetch } from '@/lib/api';

type Role = { id: number; name: string };
type User = { id: number; username: string; email: string; role: Role | null };

const AVAILABLE_ROLES = ['Admin', 'Content Manager', 'Instructor', 'Student', 'Authenticated'];

function UsersPageContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const res = await apiFetch('/users?populate=role');
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  const loadRoles = async () => {
    const res = await apiFetch('/users-permissions/roles');
    const data = await res.json();
    setRoles(data.roles ?? []);
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const handleRoleChange = async (userId: number, newRoleId: number) => {
    setSavingId(userId);
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRoleId }),
    });
    await loadUsers();
    setSavingId(null);
  };

  if (loading) return <p className="p-8">Loading users...</p>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Manage Users</h1>

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
      <UsersPageContent />
    </ProtectedRoute>
  );
}
