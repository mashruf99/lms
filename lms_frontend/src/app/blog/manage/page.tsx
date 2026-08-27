'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type BlogPost = {
  id: number;
  documentId: string;
  title: string;
  body?: any;
  coverImageUrl?: string;
  postStatus: 'draft' | 'published';
};

function extractText(blocks: any): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .map((block) => (block.children ?? []).map((c: any) => c.text ?? '').join(''))
    .join('\n');
}

function toBlocks(text: string) {
  if (!text) return null;
  return [{ type: 'paragraph', children: [{ type: 'text', text }] }];
}

function ManageBlogContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCoverImageUrl, setEditCoverImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    const res = await apiFetch('/blog-posts?sort=createdAt:desc');
    const data = await res.json();
    setPosts(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    const res = await apiFetch('/blog-posts', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title,
          body: toBlocks(body),
          coverImageUrl: coverImageUrl || null,
          postStatus: 'draft',
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Failed to create post');
      setCreating(false);
      return;
    }

    setTitle('');
    setBody('');
    setCoverImageUrl('');
    setCreating(false);
    await loadPosts();
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this post?')) return;
    await apiFetch(`/blog-posts/${documentId}`, { method: 'DELETE' });
    await loadPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const newStatus = post.postStatus === 'published' ? 'draft' : 'published';
    await apiFetch(`/blog-posts/${post.documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { postStatus: newStatus } }),
    });
    await loadPosts();
  };

  const startEdit = (post: BlogPost) => {
    setEditingId(post.documentId);
    setEditTitle(post.title);
    setEditBody(extractText(post.body));
    setEditCoverImageUrl(post.coverImageUrl ?? '');
  };

  const saveEdit = async (documentId: string) => {
    setSaving(true);
    await apiFetch(`/blog-posts/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          title: editTitle,
          body: toBlocks(editBody),
          coverImageUrl: editCoverImageUrl || null,
        },
      }),
    });
    setSaving(false);
    setEditingId(null);
    await loadPosts();
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Manage Blog</h1>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 mb-8 border rounded p-4">
        <input
          type="text"
          required
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <textarea
          placeholder="Post body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="border rounded px-3 py-2"
          rows={4}
        />
        <input
          type="text"
          placeholder="Cover image URL (optional)"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50 self-start"
        >
          {creating ? 'Creating...' : 'Create Post (as Draft)'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) =>
            editingId === post.documentId ? (
              <li key={post.id} className="border rounded p-4 flex flex-col gap-3 bg-gray-50">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="border rounded px-3 py-2"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="border rounded px-3 py-2"
                  rows={4}
                />
                <input
                  type="text"
                  placeholder="Cover image URL"
                  value={editCoverImageUrl}
                  onChange={(e) => setEditCoverImageUrl(e.target.value)}
                  className="border rounded px-3 py-2"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => saveEdit(post.documentId)}
                    disabled={saving}
                    className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)} className="underline">
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li key={post.id} className="border rounded px-4 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{post.title}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        post.postStatus === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {post.postStatus}
                    </span>
                  </div>
                  <div className="flex gap-3 shrink-0 ml-4">
                    <button onClick={() => togglePublish(post)} className="text-sm underline">
                      {post.postStatus === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => startEdit(post)} className="text-sm underline">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.documentId)}
                      className="text-sm text-red-600 underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

export default function ManageBlogPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'Content Manager']}>
      <AppShell>
        <ManageBlogContent />
      </AppShell>
    </ProtectedRoute>
  );
}
