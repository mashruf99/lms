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

    // Load existing question texts for this topic to skip duplicates
    const existing = await strapi.db.query('api::question.question').findMany({
      where: { topic: topic.id },
      select: ['text'],
    });
    const existingTexts = new Set(existing.map((q: any) => q.text));

    const toCreate = imported.filter((q) => !existingTexts.has(q.text));
    const duplicateCount = imported.length - toCreate.length;

    let createdCount = 0;
    if (toCreate.length > 0) {
      const rows = toCreate.map((q) => ({
        text: q.text,
        options: q.options,
        correctOptionIndex: null,
        topic: topic.id,
        publishedAt: new Date().toISOString(),
      }));

      await strapi.db.query('api::question.question').createMany({ data: rows });
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
