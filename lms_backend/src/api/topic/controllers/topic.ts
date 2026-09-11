/**
 * topic controller
 */
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ForbiddenError, ValidationError } = errors;

type ParsedQuestion = {
  text: string;
  options: string[];
};

type ParseResult = {
  imported: ParsedQuestion[];
  skipped: { line: number; reason: string; snippet: string }[];
};

function parseMarkdown(markdown: string): ParseResult {
  const lines = markdown.split('\n');
  const imported: ParsedQuestion[] = [];
  const skipped: ParseResult['skipped'] = [];

  const questionStart = /^\s*\d+\.\s*\*\*(.+?)\*\*/;
  const optionLine = /^\s*[\(]?([a-dA-Dকখগঘ])[\)\.]?\s*(.+)$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(questionStart);

    if (!match) {
      i++;
      continue;
    }

    const questionText = match[1].trim();
    const startLine = i;
    const options: string[] = [];

    let j = i + 1;
    while (j < lines.length) {
      const optMatch = lines[j].match(optionLine);
      const isNextQuestion = questionStart.test(lines[j]);

      if (isNextQuestion) break;

      if (optMatch) {
        options.push(optMatch[2].trim());
        j++;
        continue;
      }

      if (lines[j].trim() === '') {
        j++;
        continue;
      }

      break;
    }

    if (options.length >= 2) {
      imported.push({ text: questionText, options });
    } else {
      skipped.push({
        line: startLine + 1,
        reason: 'Fewer than 2 recognizable options found',
        snippet: questionText.slice(0, 80),
      });
    }

    i = j;
  }

  return { imported, skipped };
}

const CONCURRENCY = 20;

async function runWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>, limit: number) {
  let index = 0;
  async function next(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    await worker(items[current]);
    return next();
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
}

export default factories.createCoreController('api::topic.topic', ({ strapi }) => ({
  async importMarkdown(ctx: any) {
    const user = ctx.state.user;

    if (!user || user.role?.name !== 'Admin') {
      throw new ForbiddenError('Only Admin can import questions');
    }

    const { topicId, markdown } = ctx.request.body;

    if (!topicId || !markdown || typeof markdown !== 'string') {
      throw new ValidationError('topicId and markdown (string) are required');
    }

    const topic = await strapi.db.query('api::topic.topic').findOne({
      where: { documentId: topicId },
    });

    if (!topic) {
      throw new ValidationError('Topic not found');
    }

    const { imported, skipped } = parseMarkdown(markdown);

    const existing = await strapi.db.query('api::question.question').findMany({
      where: { topic: topic.id },
      select: ['text'],
    });
    const existingTexts = new Set(existing.map((q: any) => q.text));

    const toCreate = imported.filter((q) => !existingTexts.has(q.text));
    const duplicateCount = imported.length - toCreate.length;

    let createdCount = 0;
    if (toCreate.length > 0) {
      // Step 1: fast bulk insert of base fields (no relation)
      await strapi.db.query('api::question.question').createMany({
        data: toCreate.map((q) => ({
          text: q.text,
          options: q.options,
          correctOptionIndex: null,
          publishedAt: new Date().toISOString(),
        })),
      });

      // Step 2: find the rows we just inserted (by text, scoped to no topic yet)
      // and link them to the topic concurrently, not sequentially.
      const newlyInserted = await strapi.db.query('api::question.question').findMany({
        where: {
          text: { $in: toCreate.map((q) => q.text) },
          topic: null,
        },
        select: ['id'],
      });

      await runWithConcurrency(
        newlyInserted,
        async (row: any) => {
          await strapi.db.query('api::question.question').update({
            where: { id: row.id },
            data: { topic: topic.id },
          });
        },
        CONCURRENCY
      );

      createdCount = toCreate.length;
    }

    ctx.body = {
      data: {
        topicName: topic.name,
        importedCount: createdCount,
        duplicateSkippedCount: duplicateCount,
        formatSkippedCount: skipped.length,
        skipped,
      },
    };
  },
}));
