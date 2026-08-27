'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ROLE_HOME: Record<string, string> = {
  Admin: '/admin/users',
  'Content Manager': '/courses/manage',
  Instructor: '/courses/manage',
  Student: '/my-courses',
};

export default function DashboardPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const destination = role ? ROLE_HOME[role] : null;
    router.push(destination ?? '/pending-role');
  }, [user, role, loading, router]);

  return <div className="flex min-h-screen items-center justify-center">Redirecting...</div>;
}
