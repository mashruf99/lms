'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type BlogPost = {
  id: number;
  documentId: string;
  title: string;
  coverImageUrl?: string;
  createdAt: string;
};

export default function BlogListPage() {
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

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Blog</h1>

      {posts.length === 0 ? (
        <p className="text-gray-500">No posts published yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.id} className="border rounded px-4 py-3">
              <Link href={`/blog/${post.documentId}`} className="font-medium underline">
                {post.title}
              </Link>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
