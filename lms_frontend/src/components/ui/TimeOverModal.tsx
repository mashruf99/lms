'use client';

import { useEffect } from 'react';

export default function TimeOverModal({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [open, onDone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg px-8 py-6 text-center">
        <p className="text-xl font-semibold text-gray-900 dark:text-white">Time Over</p>
      </div>
    </div>
  );
}
