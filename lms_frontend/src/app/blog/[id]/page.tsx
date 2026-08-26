'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

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

export default function BlogPostPage() {
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

  if (loading) return <p className="p-8">Loading...</p>;
  if (notFound || !post) return <p className="p-8">Post not found.</p>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <a href="/blog" className="text-sm underline mb-4 inline-block">
        ← Back to Blog
      </a>
      <h1 className="text-2xl font-semibold mb-2">{post.title}</h1>
      <p className="text-xs text-gray-500 mb-6">
        {new Date(post.createdAt).toLocaleDateString()}
      </p>
      {post.coverImageUrl && (
        <p className="text-sm text-gray-600 mb-4">Cover: {post.coverImageUrl}</p>
      )}
      <p className="whitespace-pre-wrap">{extractText(post.body)}</p>
    </div>
  );
}
