'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PublicHeader from '@/components/layout/PublicHeader';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';

type BlogPost = {
  id: number;
  documentId: string;
  title: string;
  coverImageUrl?: string;
  createdAt: string;
};

function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch(
        '/blog-posts?filters[postStatus][$eq]=published&sort=createdAt:desc'
      );
      const data = await res.json();
      setPosts(data.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Blog</h1>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No posts published yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li
              key={post.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <Link href={`/blog/${post.documentId}`} className="font-medium text-gray-900 dark:text-gray-100 hover:underline">
                {post.title}
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BlogListPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user) {
    return (
      <AppShell>
        <BlogList />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <PublicHeader />
      <BlogList />
    </div>
  );
}
