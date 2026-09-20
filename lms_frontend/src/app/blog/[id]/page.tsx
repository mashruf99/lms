'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PublicHeader from '@/components/layout/PublicHeader';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';

type BlogPost = {
  id: number;
  documentId: string;
  title: string;
  body?: any;
  coverImageUrl?: string;
  createdAt: string;
};

function extractText(blocks: any): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .map((block) => (block.children ?? []).map((c: any) => c.text ?? '').join(''))
    .join('\n');
}

function PostBody() {
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch(`/blog-posts/${postId}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPost(data.data ?? null);
      setLoading(false);
    };
    load();
  }, [postId]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      ) : notFound || !post ? (
        <p className="text-gray-500 dark:text-gray-400">Post not found.</p>
      ) : (
        <>
          <a href="/blog" className="text-sm underline mb-4 inline-block text-gray-600 dark:text-gray-400">
            ← Back to Blog
          </a>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{post.title}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
            {post.coverImageUrl && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Cover: {post.coverImageUrl}</p>
            )}
            <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{extractText(post.body)}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function BlogPostPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user) {
    return (
      <AppShell>
        <PostBody />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <PublicHeader />
      <PostBody />
    </div>
  );
}
