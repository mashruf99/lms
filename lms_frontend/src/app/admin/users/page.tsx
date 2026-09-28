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

type Payment = {
  id: number;
  documentId: string;
  transactionId: string;
  paymentMethod: 'bkash' | 'nagad' | 'rocket';
  senderNumber: string;
  amount: number;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  user?: { id: number; username: string; email: string } | null;
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 shadow-sm text-center">
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: User['approvalStatus'] }) {
  const styles = {
    pending: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    approved: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
    rejected: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function UsersPageContent() {
  const [tab, setTab] = useState<'users' | 'payments'>('users');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [paymentsSavingDocId, setPaymentsSavingDocId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [loading, setLoading] = useState(true);

  // ─── Loaders ───────────────────────────────────────────────
  const loadUsers = async () => {
    const res = await apiFetch('/users?populate=role');
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : data?.data ?? []);
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

  const loadPayments = async () => {
    const res = await apiFetch(
      '/payments?filters[approval_status][$eq]=pending&populate[user][fields][0]=username&populate[user][fields][1]=email&sort=submittedAt:desc'
    );
    const data = await res.json();
    if (!res.ok) {
      setPaymentsError(data.error?.message || 'Failed to load pending payments.');
      setPayments([]);
      return;
    }
    setPaymentsError(null);
    setPayments(data.data ?? []);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadRoles(), loadStats(), loadPayments()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ─── Users actions ─────────────────────────────────────────
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

  // ─── Payments actions ──────────────────────────────────────
  const handleApprovePayment = async (payment: Payment) => {
    setPaymentsSavingDocId(payment.documentId);
    const res = await apiFetch(`/payments/${payment.documentId}/approve`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to approve payment.');
    }
    await loadAll();
    setPaymentsSavingDocId(null);
  };

  const openRejectModal = (payment: Payment) => {
    setRejectTarget(payment);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length === 0) {
      alert('Please provide a rejection reason.');
      return;
    }

    setPaymentsSavingDocId(rejectTarget.documentId);
    const res = await apiFetch(`/payments/${rejectTarget.documentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: rejectReason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to reject payment.');
    }
    setRejectTarget(null);
    setRejectReason('');
    await loadAll();
    setPaymentsSavingDocId(null);
  };

  if (loading) return <p className="p-8">Loading...</p>;

  // ─── Derived counts ────────────────────────────────────────
  const pendingUserCount = users.filter((u) => u.approvalStatus === 'pending').length;
  const pendingPaymentCount = payments.length;
  const visibleUsers =
    filter === 'pending' ? users.filter((u) => u.approvalStatus === 'pending') : users;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Admin Dashboard
      </h1>

      {stats && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
            Platform Stats
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Topics" value={stats.totalTopics} />
            <StatCard label="Questions" value={stats.totalQuestions} />
            <StatCard label="Unanswered" value={stats.totalUnansweredQuestions} />
            <StatCard label="Attempts" value={stats.totalAttempts} />
          </div>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'users'
              ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Users
          {pendingUserCount > 0 && (
            <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
              ({pendingUserCount} pending)
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'payments'
              ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Payments
          {pendingPaymentCount > 0 && (
            <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
              ({pendingPaymentCount} pending)
            </span>
          )}
        </button>
      </div>

      {/* ─── Users tab ─── */}
      {tab === 'users' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Manage Users
            </h2>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded-md ${
                  filter === 'pending'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'border border-gray-300 dark:border-gray-700'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md ${
                  filter === 'all'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'border border-gray-300 dark:border-gray-700'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {visibleUsers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'pending' ? 'No pending approvals.' : 'No users.'}
            </p>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b bg-gray-50 dark:bg-gray-800/50">
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
                      <td className="py-2 px-4 text-gray-600 dark:text-gray-400">
                        {u.email}
                      </td>
                      <td className="py-2 px-4">
                        <StatusBadge status={u.approvalStatus ?? 'pending'} />
                      </td>
                      <td className="py-2 px-4">
                        <select
                          value={roles.find((r) => r.name === u.role?.name)?.id ?? ''}
                          disabled={savingId === u.id}
                          onChange={(e) => handleRoleChange(u.id, Number(e.target.value))}
                          className="border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm"
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
                            className="text-xs text-green-700 dark:text-green-300 underline mr-3 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {u.approvalStatus !== 'rejected' && (
                          <button
                            onClick={() => handleApproval(u.id, 'rejected')}
                            disabled={savingId === u.id}
                            className="text-xs text-red-600 dark:text-red-400 underline disabled:opacity-50"
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
        </>
      )}

      {/* ─── Payments tab ─── */}
      {tab === 'payments' && (
        <>
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
            Pending Payments
          </h2>

          {paymentsError && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">{paymentsError}</p>
          )}

          {payments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No pending payments.</p>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50 dark:bg-gray-800/50">
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Sender</th>
                    <th className="py-2 px-3">TrxID</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Submitted</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        <div className="text-gray-900 dark:text-gray-100">
                          {p.user?.username ?? '—'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {p.user?.email ?? ''}
                        </div>
                      </td>
                      <td className="py-2 px-3 capitalize">{p.paymentMethod}</td>
                      <td className="py-2 px-3 font-mono text-xs">{p.senderNumber}</td>
                      <td className="py-2 px-3 font-mono text-xs">{p.transactionId}</td>
                      <td className="py-2 px-3">{p.amount}৳</td>
                      <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(p.submittedAt ?? p.createdAt)}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => handleApprovePayment(p)}
                          disabled={paymentsSavingDocId === p.documentId}
                          className="text-xs text-green-700 dark:text-green-300 underline mr-3 disabled:opacity-50"
                        >
                          {paymentsSavingDocId === p.documentId ? 'Working…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => openRejectModal(p)}
                          disabled={paymentsSavingDocId === p.documentId}
                          className="text-xs text-red-600 dark:text-red-400 underline disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── Reject modal ─── */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-medium mb-1 text-gray-900 dark:text-gray-100">
              Reject payment?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              TrxID <span className="font-mono">{rejectTarget.transactionId}</span> from{' '}
              <span className="font-mono">{rejectTarget.senderNumber}</span>
            </p>

            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Rejection reason
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Transaction ID not found in our statement"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={paymentsSavingDocId !== null}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {paymentsSavingDocId ? 'Rejecting…' : 'Confirm reject'}
              </button>
            </div>
          </div>
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
