import { errors } from '@strapi/utils';

const { ValidationError, ForbiddenError, NotFoundError } = errors;

const MCQ_BLOCK_SIZE = 30;
const CQ_BLOCK_SIZE = 10;
const MCQ_MINUTES_PER_QUESTION = 1;
const CQ_MINUTES_PER_QUESTION = 4;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function assertApproved(strapi: any, user: any) {
  if (!user) {
    throw new ForbiddenError('Not authenticated');
  }
  if (user.approvalStatus !== 'approved') {
    throw new ForbiddenError('Your account is not approved yet');
  }
}

export default {
  // GET /practice/topics?type=mcq|cq
  async topics(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const type = ctx.query.type === 'cq' ? 'cq' : 'mcq';
    const topics = await strapi.db.query('api::topic.topic').findMany({
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(
      topics.map(async (topic: any) => {
        const totalQuestions =
          type === 'mcq'
            ? await strapi.db.query('api::question.question').count({
                where: { topic: topic.id, correctOptionIndex: { $notNull: true } },
              })
            : await strapi.db.query('api::written-question.written-question').count({
                where: { topic: topic.id },
              });

        const attempts = await strapi.db.query('api::attempt.attempt').findMany({
          where: { user: user.id, topic: topic.id, type },
        });

        const seenIds = new Set<number>();
        for (const a of attempts) {
          (a.questionIds || []).forEach((id: number) => seenIds.add(id));
        }

        return {
          topicId: topic.documentId,
          name: topic.name,
          totalQuestions,
          seenCount: seenIds.size,
          attemptCount: attempts.length,
          lastAttemptAt: attempts.length
            ? attempts.reduce((latest: string, a: any) => (a.startedAt > latest ? a.startedAt : latest), attempts[0].startedAt)
            : null,
        };
      })
    );

    ctx.body = { data: result };
  },

  // POST /practice/start  { topicId, type: 'mcq' | 'cq' }
  async start(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const { topicId, type } = ctx.request.body;

    if (!topicId || !['mcq', 'cq'].includes(type)) {
      throw new ValidationError('topicId and type (mcq|cq) are required');
    }

    const topic = await strapi.db.query('api::topic.topic').findOne({
      where: { documentId: topicId },
    });
    if (!topic) {
      throw new NotFoundError('Topic not found');
    }

    const blockSize = type === 'mcq' ? MCQ_BLOCK_SIZE : CQ_BLOCK_SIZE;
    const minutesPerQuestion = type === 'mcq' ? MCQ_MINUTES_PER_QUESTION : CQ_MINUTES_PER_QUESTION;

    const allQuestions =
      type === 'mcq'
        ? await strapi.db.query('api::question.question').findMany({
            where: { topic: topic.id, correctOptionIndex: { $notNull: true } },
          })
        : await strapi.db.query('api::written-question.written-question').findMany({
            where: { topic: topic.id },
          });

    if (allQuestions.length === 0) {
      throw new ValidationError('No questions available for this topic yet');
    }

    // Find questions this user has already seen for this topic+type
    const priorAttempts = await strapi.db.query('api::attempt.attempt').findMany({
      where: { user: user.id, topic: topic.id, type },
    });
    const seenIds = new Set<number>();
    for (const a of priorAttempts) {
      (a.questionIds || []).forEach((id: number) => seenIds.add(id));
    }

    let unseen = allQuestions.filter((q: any) => !seenIds.has(q.id));

    let pool: any[];
    let cycleReset = false;
    if (unseen.length >= blockSize) {
      pool = shuffle(unseen).slice(0, blockSize);
    } else if (unseen.length > 0) {
      // take remaining unseen, top up with previously-seen ones to fill the block
      const needed = blockSize - unseen.length;
      const seenPool = allQuestions.filter((q: any) => seenIds.has(q.id));
      pool = [...unseen, ...shuffle(seenPool).slice(0, needed)];
      cycleReset = true;
    } else {
      // fully exhausted, start a new cycle from all questions
      pool = shuffle(allQuestions).slice(0, Math.min(blockSize, allQuestions.length));
      cycleReset = true;
    }

    const questionIds = pool.map((q: any) => q.id);

    const attempt = await strapi.db.query('api::attempt.attempt').create({
      data: {
        user: user.id,
        topic: topic.id,
        type,
        questionIds,
        answers: null,
        startedAt: new Date().toISOString(),
      },
    });

    // Return questions WITHOUT the answer key
    const sanitized = pool.map((q: any) =>
      type === 'mcq'
        ? { id: q.id, text: q.text, options: q.options }
        : { id: q.id, text: q.text, marks: q.marks }
    );

    ctx.body = {
      data: {
        attemptId: attempt.documentId,
        type,
        topicName: topic.name,
        questions: sanitized,
        timeLimitSeconds: pool.length * minutesPerQuestion * 60,
        cycleReset,
      },
    };
  },

  // POST /practice/submit  { attemptId, answers }
  async submit(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const { attemptId, answers } = ctx.request.body;

    if (!attemptId || typeof answers !== 'object') {
      throw new ValidationError('attemptId and answers are required');
    }

    const attempt = await strapi.db.query('api::attempt.attempt').findOne({
      where: { documentId: attemptId, user: user.id },
    });

    if (!attempt) {
      throw new NotFoundError('Attempt not found');
    }

    if (attempt.completedAt) {
      throw new ValidationError('This attempt has already been submitted');
    }

    let updateData: any = {
      answers,
      completedAt: new Date().toISOString(),
      totalQuestions: attempt.questionIds.length,
    };

    if (attempt.type === 'mcq') {
      const questions = await strapi.db.query('api::question.question').findMany({
        where: { id: { $in: attempt.questionIds } },
      });
      let correctCount = 0;
      for (const q of questions) {
        if (answers[q.id] === q.correctOptionIndex) correctCount += 1;
      }
      updateData.correctCount = correctCount;
      updateData.score = Math.round((correctCount / questions.length) * 100);
    }
    // CQ: no scoring, just save answers

    const updated = await strapi.db.query('api::attempt.attempt').update({
      where: { id: attempt.id },
      data: updateData,
    });

    ctx.body = { data: { attemptId: updated.documentId } };
  },

  // GET /practice/attempt/:id/review
  async review(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const { id } = ctx.params;

    const attempt = await strapi.db.query('api::attempt.attempt').findOne({
      where: { documentId: id, user: user.id },
      populate: { topic: true },
    });

    if (!attempt) {
      throw new NotFoundError('Attempt not found');
    }

    if (attempt.type === 'mcq') {
      const questions = await strapi.db.query('api::question.question').findMany({
        where: { id: { $in: attempt.questionIds } },
      });
      const byId = new Map(questions.map((q: any) => [q.id, q]));

      const items = attempt.questionIds.map((qid: number) => {
        const q: any = byId.get(qid);
        return {
          id: qid,
          text: q?.text,
          options: q?.options,
          correctOptionIndex: q?.correctOptionIndex,
          explanation: q?.explanation,
          yourAnswer: attempt.answers?.[qid] ?? null,
        };
      });

      ctx.body = {
        data: {
          type: 'mcq',
          topicName: attempt.topic?.name,
          score: attempt.score,
          correctCount: attempt.correctCount,
          totalQuestions: attempt.totalQuestions,
          items,
        },
      };
      return;
    }

    // CQ review
    const questions = await strapi.db.query('api::written-question.written-question').findMany({
      where: { id: { $in: attempt.questionIds } },
    });
    const byId = new Map(questions.map((q: any) => [q.id, q]));

    const items = attempt.questionIds.map((qid: number) => {
      const q: any = byId.get(qid);
      return {
        id: qid,
        text: q?.text,
        marks: q?.marks,
        modelAnswer: q?.modelAnswer,
        yourAnswer: attempt.answers?.[qid] ?? '',
      };
    });

    ctx.body = {
      data: {
        type: 'cq',
        topicName: attempt.topic?.name,
        totalQuestions: attempt.totalQuestions,
        items,
      },
    };
  },

  // GET /practice/dashboard
  async dashboard(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const attempts = await strapi.db.query('api::attempt.attempt').findMany({
      where: { user: user.id, completedAt: { $notNull: true } },
      populate: { topic: true },
    });

    const mcqAttempts = attempts.filter((a: any) => a.type === 'mcq');
    const cqAttempts = attempts.filter((a: any) => a.type === 'cq');

    const mcqQuestionsSolved = new Set<number>();
    mcqAttempts.forEach((a: any) => (a.questionIds || []).forEach((id: number) => mcqQuestionsSolved.add(id)));

    const cqQuestionsSolved = new Set<number>();
    cqAttempts.forEach((a: any) => (a.questionIds || []).forEach((id: number) => cqQuestionsSolved.add(id)));

    // Per-topic breakdown (MCQ) - track the BEST score per topic, not an average of all attempts
    const topicMap = new Map<string, { name: string; attempts: number; solved: Set<number>; bestScore: number }>();
    for (const a of mcqAttempts) {
      const key = a.topic?.documentId ?? 'unknown';
      if (!topicMap.has(key)) {
        topicMap.set(key, { name: a.topic?.name ?? 'Unknown', attempts: 0, solved: new Set(), bestScore: 0 });
      }
      const entry = topicMap.get(key)!;
      entry.attempts += 1;
      entry.bestScore = Math.max(entry.bestScore, a.score ?? 0);
      (a.questionIds || []).forEach((id: number) => entry.solved.add(id));
    }

    const topicProgress = await Promise.all(
      Array.from(topicMap.entries()).map(async ([topicDocId, entry]) => {
        const topicRow = await strapi.db.query('api::topic.topic').findOne({ where: { documentId: topicDocId } });
        const totalQuestions = topicRow
          ? await strapi.db.query('api::question.question').count({
              where: { topic: topicRow.id, correctOptionIndex: { $notNull: true } },
            })
          : 0;
        return {
          topicId: topicDocId,
          name: entry.name,
          attempts: entry.attempts,
          questionsSolved: entry.solved.size,
          totalQuestions,
          bestScore: entry.bestScore,
        };
      })
    );

    const overallAvgScore = topicProgress.length
      ? Math.round(topicProgress.reduce((sum, t) => sum + t.bestScore, 0) / topicProgress.length)
      : 0;

    ctx.body = {
      data: {
        totalAttempts: attempts.length,
        mcqAttempts: mcqAttempts.length,
        cqAttempts: cqAttempts.length,
        mcqQuestionsSolved: mcqQuestionsSolved.size,
        cqQuestionsSolved: cqQuestionsSolved.size,
        averageMcqScore: overallAvgScore,
        topicProgress,
      },
    };
  },
};
