'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function PendingRolePage() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold mb-3">Account Pending</h1>
        <p className="text-gray-600 mb-6">
          Your account has been created, but an administrator hasn&apos;t assigned you a
          role yet. Please check back soon, or contact your administrator.
        </p>
        <button onClick={handleLogout} className="underline text-sm">
          Log out
        </button>
      </div>
    </div>
  );
}
