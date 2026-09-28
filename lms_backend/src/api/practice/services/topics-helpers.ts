/**
 * Shared helpers for topic counting and sampling.
 *
 * Used by:
 *   - src/api/public/controllers/public.ts (public preview endpoint)
 *
 * Will eventually be used by:
 *   - src/api/practice/controllers/practice.ts (authenticated endpoint)
 *     — once refactored in a follow-up step, after the public endpoint is
 *     verified stable.
 *
 * Design notes:
 *   - "Valid MCQ" definition: has a correctOptionIndex (unanswered questions
 *     are excluded from the student-facing count).
 *   - "Valid CQ" definition: every written-question row for the topic.
 *   - Samples intentionally select ONLY the fields a visitor needs to see.
 *     They never include correctOptionIndex, modelAnswer, or any answer key.
 */

export async function countTopicQuestions(strapi: any, topicId: number) {
  const totalMcq = await strapi.db.query('api::question.question').count({
    where: { topic: topicId, correctOptionIndex: { $notNull: true } },
  });

  const totalCq = await strapi.db
    .query('api::written-question.written-question')
    .count({
      where: { topic: topicId },
    });

  return { totalMcq, totalCq };
}

export async function getSampleMcqs(strapi: any, topicId: number, limit = 3) {
  const rows = await strapi.db.query('api::question.question').findMany({
    where: { topic: topicId, correctOptionIndex: { $notNull: true } },
    limit,
    select: ['text', 'options'],
  });

  // Explicitly shape the response so nothing extra leaks (no ids, no citation
  // unless you later decide to include it — for now, just text + options).
  return rows.map((q: any) => ({
    text: q.text,
    options: q.options,
  }));
}

export async function getSampleCqs(strapi: any, topicId: number, limit = 3) {
  const rows = await strapi.db
    .query('api::written-question.written-question')
    .findMany({
      where: { topic: topicId },
      limit,
      select: ['text', 'marks'],
    });

  return rows.map((q: any) => ({
    text: q.text,
    marks: q.marks,
  }));
}
