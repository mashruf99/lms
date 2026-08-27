'use client';

import Link from 'next/link';
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute';

function LandingContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900">LMS</span>
          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 rounded-md text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold text-gray-900 mb-4">
          Learn at your own pace
        </h1>
        <p className="text-gray-600 text-lg mb-10">
          A learning management platform for structured courses, tracked progress,
          and graded quizzes — built for students and instructors alike.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="px-6 py-2.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm"
          >
            Get started
          </Link>
          <Link
            href="/blog"
            className="px-6 py-2.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Read the blog
          </Link>
        </div>
      </main>

      <section className="max-w-4xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          { title: 'Structured Courses', body: 'Lessons organized in sequence, with clear progress tracking.' },
          { title: 'Graded Quizzes', body: 'Test your understanding with instantly graded quizzes.' },
          { title: 'Role-based Access', body: 'Students, instructors, and admins each get a tailored experience.' },
        ].map((item) => (
          <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function LandingPage() {
  return (
    <PublicOnlyRoute>
      <LandingContent />
    </PublicOnlyRoute>
  );
}
