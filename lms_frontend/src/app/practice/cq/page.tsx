'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import TopicGrid from '@/components/practice/TopicGrid';

export default function CqTopicsPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <TopicGrid type="cq" />
      </AppShell>
    </ProtectedRoute>
  );
}
