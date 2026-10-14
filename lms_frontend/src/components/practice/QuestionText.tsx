'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders question text as markdown. Handles:
 *  - fenced code blocks (```cpp, ```java, ```python, etc.)
 *  - inline `code`
 *  - **bold**, *italic*
 *  - bullet and numbered lists
 *
 * Fenced code with a language gets the block treatment.
 * Code with newlines but no language also treated as block.
 * Everything else is inline.
 */
export default function QuestionText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        pre({ children }) {
          return (
            <pre className="bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md p-3 overflow-x-auto my-2 text-xs leading-relaxed">
              {children}
            </pre>
          );
        },
        code({ className, children, ...props }: any) {
          const hasLanguage = typeof className === 'string' && className.startsWith('language-');
          const hasNewlines = typeof children === 'string' && children.includes('\n');
          const isBlock = hasLanguage || hasNewlines;

          if (isBlock) {
            return (
              <code className={`${className ?? ''} font-mono text-xs`} {...props}>
                {children}
              </code>
            );
          }

          return (
            <code
              className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-[0.9em] font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0 whitespace-pre-line">{children}</p>;
        },
        strong({ children }) {
          return (
            <strong className="font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </strong>
          );
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        ul({ children }) {
          return <ul className="list-disc pl-5 my-2">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-5 my-2">{children}</ol>;
        },
        li({ children }) {
          return <li className="mb-1">{children}</li>;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
