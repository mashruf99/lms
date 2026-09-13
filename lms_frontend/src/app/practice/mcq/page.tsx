'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import TopicGrid from '@/components/practice/TopicGrid';

export default function McqTopicsPage() {
  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <AppShell>
        <TopicGrid type="mcq" />
      </AppShell>
    </ProtectedRoute>
  );
}
