'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api';

type Topic = { id: number; documentId: string; name: string };

type ImportResult = {
  topicName: string;
  importedCount: number;
  duplicateSkippedCount: number;
  formatSkippedCount: number;
  skipped: { line: number; reason: string; snippet: string }[];
};

function ImportContent() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [useNewTopic, setUseNewTopic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTopics = async () => {
      const res = await apiFetch('/topics?pagination[pageSize]=100&sort=name:asc');
      const data = await res.json();
      setTopics(data.data ?? []);
    };
    loadTopics();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setFileName(f.name);
    }
  };

  const handleImport = async () => {
    setError('');
    setResult(null);

    if (!file) {
      setError('Choose a .md file first');
      return;
    }
    if (!useNewTopic && !selectedTopicId) {
      setError('Select a topic, or choose "New topic" and give it a name');
      return;
    }
    if (useNewTopic && !newTopicName.trim()) {
      setError('Enter a name for the new topic');
      return;
    }

    setImporting(true);

    try {
      let topicId = selectedTopicId;

      if (useNewTopic) {
        const createRes = await apiFetch('/topics', {
          method: 'POST',
          body: JSON.stringify({ data: { name: newTopicName.trim() } }),
        });
        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data.error?.message || 'Failed to create topic');
        }
        const createData = await createRes.json();
        topicId = createData.data.documentId;
      }

      const markdown = await file.text();

      const importRes = await apiFetch('/topics/import-markdown', {
        method: 'POST',
        body: JSON.stringify({ topicId, markdown }),
      });

      if (!importRes.ok) {
        const data = await importRes.json();
        throw new Error(data.error?.message || 'Import failed');
      }

      const data = await importRes.json();
      setResult(data.data);

      // refresh topic list in case we created one
      const topicsRes = await apiFetch('/topics?pagination[pageSize]=100&sort=name:asc');
      const topicsData = await topicsRes.json();
      setTopics(topicsData.data ?? []);

      setFile(null);
      setFileName('');
      setNewTopicName('');
      setUseNewTopic(false);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Import Questions</h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic</label>
          <div className="flex gap-3 mb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                checked={!useNewTopic}
                onChange={() => setUseNewTopic(false)}
              />
              Existing topic
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                checked={useNewTopic}
                onChange={() => setUseNewTopic(true)}
              />
              New topic
            </label>
          </div>

          {useNewTopic ? (
            <input
              type="text"
              placeholder="New topic name"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md px-3 py-2"
            />
          ) : (
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md px-3 py-2"
            >
              <option value="">Select a topic...</option>
              {topics.map((t) => (
                <option key={t.id} value={t.documentId}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Markdown file</label>
          <input
            type="file"
            accept=".md,text/markdown,text/plain"
            onChange={handleFileChange}
            className="text-sm"
          />
          {fileName && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selected: {fileName}</p>}
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleImport}
          disabled={importing}
          className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md px-4 py-2 text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 self-start"
        >
          {importing ? 'Importing...' : 'Import'}
        </button>
      </div>

      {result && (
        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="font-medium text-gray-900 dark:text-white mb-3">Result — {result.topicName}</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xl font-semibold text-green-700 dark:text-green-300">{result.importedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Imported</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-500 dark:text-gray-400">{result.duplicateSkippedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Duplicates skipped</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">{result.formatSkippedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Format skipped</p>
            </div>
          </div>

          {result.skipped.length > 0 && (
            <details>
              <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer underline">
                View skipped entries
              </summary>
              <ul className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1 max-h-64 overflow-y-auto">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    Line {s.line}: {s.reason} — "{s.snippet}"
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <AppShell>
        <ImportContent />
      </AppShell>
    </ProtectedRoute>
  );
}
