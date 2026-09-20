/**
 * topic controller
 */
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ForbiddenError, ValidationError } = errors;

type ParsedQuestion = {
  text: string;
  options: string[];
  citation: string | null;
};

type ParseResult = {
  imported: ParsedQuestion[];
  lowOptionCount: number;
};

type ParsedWrittenQuestion = {
  text: string;
  marks: number | null;
  modelAnswer: string;
  citation: string | null;
};

function parseWrittenMarkdown(markdown: string): ParsedWrittenQuestion[] {
  const lines = markdown.split('\n');
  const results: ParsedWrittenQuestion[] = [];

  // e.g. "1. **(a) Describe the following terms: 3** *[citation]*"
  const questionStart = /^\s*\d+\.\s*\*\*(.+?)\*\*\s*(?:\*\[(.+?)\]\*)?/;

  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(questionStart);

    if (!match) {
      i++;
      continue;
    }

    let rawText = match[1].trim();
    const citation = match[2] ? match[2].trim() : null;

    // Strip a leading exam sub-letter like "(a) " or "(c) "
    rawText = rawText.replace(/^\([a-zA-Z]\)\s*/, '');

    // Extract trailing marks, e.g. "...terms: 3" -> marks 3
    let marks: number | null = null;
    const marksMatch = rawText.match(/:\s*(\d+)\s*$/);
    if (marksMatch) {
      marks = parseInt(marksMatch[1], 10);
      rawText = rawText.replace(/:\s*\d+\s*$/, '').trim();
    }

    const questionText = rawText;

    // Collect every line until the next numbered question as the answer body
    let j = i + 1;
    const bodyLines: string[] = [];
    while (j < lines.length && !questionStart.test(lines[j])) {
      bodyLines.push(lines[j]);
      j++;
    }

    const modelAnswer = bodyLines.join('\n').trim();

    results.push({ text: questionText, marks, modelAnswer, citation });

    i = j;
  }

  return results;
}

function parseMarkdown(markdown: string): ParseResult {
  const lines = markdown.split('\n');
  const imported: ParsedQuestion[] = [];
  let lowOptionCount = 0;

  // Question line, optionally followed by a citation like *[Source, Date ...]*
  const questionStart = /^\s*\d+\.\s*\*\*(.+?)\*\*\s*(?:\*\[(.+?)\]\*)?/;
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
    const citation = match[2] ? match[2].trim() : null;
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

    if (options.length < 2) {
      lowOptionCount += 1;
    }

    // Import everything the question-start pattern detects, regardless of
    // option count - admin reviews/curates manually via the edit UI.
    imported.push({ text: questionText, options, citation });

    i = j;
  }

  return { imported, lowOptionCount };
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

    const { imported, lowOptionCount } = parseMarkdown(markdown);

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
          citation: q.citation,
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
        lowOptionCount,
      },
    };
  },

  async importWrittenMarkdown(ctx: any) {
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

    const parsed = parseWrittenMarkdown(markdown);

    const existing = await strapi.db.query('api::written-question.written-question').findMany({
      where: { topic: topic.id },
      select: ['text'],
    });
    const existingTexts = new Set(existing.map((q: any) => q.text));

    const toCreate = parsed.filter((q: ParsedWrittenQuestion) => !existingTexts.has(q.text));
    const duplicateCount = parsed.length - toCreate.length;

    let createdCount = 0;
    if (toCreate.length > 0) {
      await strapi.db.query('api::written-question.written-question').createMany({
        data: toCreate.map((q: ParsedWrittenQuestion) => ({
          text: q.text,
          marks: q.marks,
          modelAnswer: q.modelAnswer,
          citation: q.citation,
          publishedAt: new Date().toISOString(),
        })),
      });

      const newlyInserted = await strapi.db.query('api::written-question.written-question').findMany({
        where: {
          text: { $in: toCreate.map((q: ParsedWrittenQuestion) => q.text) },
          topic: null,
        },
        select: ['id'],
      });

      await runWithConcurrency(
        newlyInserted,
        async (row: any) => {
          await strapi.db.query('api::written-question.written-question').update({
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
      },
    };
  },
}));
