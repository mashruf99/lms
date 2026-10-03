import { errors } from '@strapi/utils';

const { ValidationError, ForbiddenError, NotFoundError } = errors;

const MCQ_BLOCK_SIZE = 10;
const CQ_BLOCK_SIZE = 5;
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

async function assertActiveSubscription(strapi: any, user: any) {
  await assertApproved(strapi, user);

  const active = await strapi
    .service('api::payment.approval')
    .hasActiveSubscription(strapi, user.id);

  if (!active) {
    const err: any = new Error(
      'Your subscription has expired. Please renew to continue.'
    );
    err.status = 403;
    err.name = 'ForbiddenError';
    throw err;
  }
}

export default {
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
      select: ['id', 'name', 'isFreeTrial'],
    });
    if (!topic) {
      throw new NotFoundError('Topic not found');
    }

    // Subscription / free-trial gate
    const hasActive = await strapi
      .service('api::payment.approval')
      .hasActiveSubscription(strapi, user.id);

    if (!hasActive) {
      if (!topic.isFreeTrial) {
        const err: any = new Error(
          'Subscribe to unlock this topic. Free trial is available on selected topics.'
        );
        err.status = 403;
        err.name = 'ForbiddenError';
        throw err;
      }

      // Race-safe: count any attempt (started or completed) on this topic
      // by this user. If they've already used their free attempt, block.
      const priorAttemptsOnTopic = await strapi.db
        .query('api::attempt.attempt')
        .count({
          where: { user: user.id, topic: topic.id },
        });

      if (priorAttemptsOnTopic > 0) {
        const err: any = new Error(
          'Free trial already used for this topic. Subscribe to continue.'
        );
        err.status = 403;
        err.name = 'ForbiddenError';
        throw err;
      }
    }

    const blockSize = type === 'mcq' ? MCQ_BLOCK_SIZE : CQ_BLOCK_SIZE;
    const minutesPerQuestion =
      type === 'mcq' ? MCQ_MINUTES_PER_QUESTION : CQ_MINUTES_PER_QUESTION;

    // Fetch only the fields we return to the client.
    const allQuestions =
      type === 'mcq'
        ? await strapi.db.query('api::question.question').findMany({
            where: { topic: topic.id, correctOptionIndex: { $notNull: true } },
            select: ['id', 'text', 'options', 'citation'],
          })
        : await strapi.db
            .query('api::written-question.written-question')
            .findMany({
              where: { topic: topic.id },
              select: ['id', 'text', 'marks', 'citation'],
            });

    if (allQuestions.length === 0) {
      throw new ValidationError('No questions available for this topic yet');
    }

    // Find questions this user has already seen for this topic+type
    const priorAttempts = await strapi.db
      .query('api::attempt.attempt')
      .findMany({
        where: { user: user.id, topic: topic.id, type },
        select: ['questionIds'],
      });

    const seenIds = new Set<number>();
    for (const a of priorAttempts) {
      (a.questionIds || []).forEach((id: any) => seenIds.add(Number(id)));
    }

    const unseen = allQuestions.filter((q: any) => !seenIds.has(q.id));

    let pool: any[];
    let cycleReset = false;
    if (unseen.length >= blockSize) {
      pool = shuffle(unseen).slice(0, blockSize);
    } else if (unseen.length > 0) {
      const needed = blockSize - unseen.length;
      const seenPool = allQuestions.filter((q: any) => seenIds.has(q.id));
      pool = [...unseen, ...shuffle(seenPool).slice(0, needed)];
      cycleReset = true;
    } else {
      pool = shuffle(allQuestions).slice(
        0,
        Math.min(blockSize, allQuestions.length)
      );
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

    const sanitized = pool.map((q: any) =>
      type === 'mcq'
        ? { id: q.id, text: q.text, options: q.options, citation: q.citation }
        : { id: q.id, text: q.text, marks: q.marks, citation: q.citation }
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
    // Session validity is enforced at start time. Once a session exists,
    // the user is entitled to submit it — even if their subscription
    // expired in the meantime. This preserves free-trial flow too.
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

    const updateData: any = {
      answers,
      completedAt: new Date().toISOString(),
      totalQuestions: attempt.questionIds.length,
    };

    if (attempt.type === 'mcq') {
      const questions = await strapi.db
        .query('api::question.question')
        .findMany({
          where: { id: { $in: attempt.questionIds } },
          select: ['id', 'correctOptionIndex'],
        });
      let correctCount = 0;
      for (const q of questions) {
        if (answers[q.id] === q.correctOptionIndex) correctCount += 1;
      }
      updateData.correctCount = correctCount;
      updateData.score = Math.round((correctCount / questions.length) * 100);
    }

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
      const questions = await strapi.db
        .query('api::question.question')
        .findMany({
          where: { id: { $in: attempt.questionIds } },
        });
      const byId = new Map(questions.map((q: any) => [q.id, q]));

      const answeredQids = attempt.questionIds.filter((qid: number) => {
        const a = attempt.answers?.[qid];
        return a !== null && a !== undefined;
      });

      const items = answeredQids.map((qid: number) => {
        const q: any = byId.get(qid);
        return {
          id: qid,
          text: q?.text,
          options: q?.options,
          correctOptionIndex: q?.correctOptionIndex,
          explanation: q?.explanation,
          citation: q?.citation,
          yourAnswer: attempt.answers?.[qid] ?? null,
        };
      });

      const totalQuestions =
        attempt.totalQuestions ?? attempt.questionIds.length;
      const answeredCount = items.length;
      const skippedCount = Math.max(0, totalQuestions - answeredCount);

      ctx.body = {
        data: {
          type: 'mcq',
          topicName: attempt.topic?.name,
          score: attempt.score,
          correctCount: attempt.correctCount,
          totalQuestions,
          answeredCount,
          skippedCount,
          items,
        },
      };
      return;
    }

    // CQ review
    const questions = await strapi.db
      .query('api::written-question.written-question')
      .findMany({
        where: { id: { $in: attempt.questionIds } },
      });
    const byId = new Map(questions.map((q: any) => [q.id, q]));

    const answeredQids = attempt.questionIds.filter((qid: number) => {
      const a = attempt.answers?.[qid];
      return typeof a === 'string' && a.trim().length > 0;
    });

    const items = answeredQids.map((qid: number) => {
      const q: any = byId.get(qid);
      return {
        id: qid,
        text: q?.text,
        marks: q?.marks,
        modelAnswer: q?.modelAnswer,
        yourAnswer: attempt.answers?.[qid] ?? '',
      };
    });

    const totalQuestions = attempt.totalQuestions ?? attempt.questionIds.length;
    const answeredCount = items.length;
    const skippedCount = Math.max(0, totalQuestions - answeredCount);

    ctx.body = {
      data: {
        type: 'cq',
        topicName: attempt.topic?.name,
        totalQuestions,
        answeredCount,
        skippedCount,
        items,
      },
    };
  },




  // POST /practice/retry-skipped  { attemptId }
  // Creates a new attempt with only the questions that were skipped
  // in the referenced attempt. Preserves question order. Does not
  // leak question IDs to the client — the client just names an attempt.
  async retrySkipped(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const { attemptId } = ctx.request.body;
    if (!attemptId) {
      throw new ValidationError('attemptId is required');
    }

    const original = await strapi.db.query('api::attempt.attempt').findOne({
      where: { documentId: attemptId, user: user.id },
      populate: { topic: true },
    });

    if (!original) {
      throw new NotFoundError('Attempt not found');
    }

    if (!original.completedAt) {
      throw new ValidationError('This attempt has not been submitted yet');
    }

    // Gate: subscription active OR free-trial topic.
    // Note: retry-skipped intentionally does NOT check "used free trial"
    // — the user is retrying the exact same questions they were already
    // shown, not accessing new content. Consistent with free-trial intent.
    const hasActive = await strapi
      .service('api::payment.approval')
      .hasActiveSubscription(strapi, user.id);

    if (!hasActive && !original.topic?.isFreeTrial) {
      const err: any = new Error(
        'Subscribe to retry skipped questions on this topic.'
      );
      err.status = 403;
      err.name = 'ForbiddenError';
      throw err;
    }

    // Compute skipped question IDs
    const skippedQids = (original.questionIds || []).filter((qid: number) => {
      const a = original.answers?.[qid];
      if (original.type === 'mcq') {
        return a === null || a === undefined;
      }
      // CQ — empty or whitespace-only counts as skipped
      return typeof a !== 'string' || a.trim().length === 0;
    });

    if (skippedQids.length === 0) {
      throw new ValidationError('No skipped questions to retry');
    }

    // Fetch the skipped questions (same field selection as /practice/start)
    const questions =
      original.type === 'mcq'
        ? await strapi.db.query('api::question.question').findMany({
            where: { id: { $in: skippedQids } },
            select: ['id', 'text', 'options', 'citation'],
          })
        : await strapi.db
            .query('api::written-question.written-question')
            .findMany({
              where: { id: { $in: skippedQids } },
              select: ['id', 'text', 'marks', 'citation'],
            });

    if (questions.length === 0) {
      throw new ValidationError('Skipped questions are no longer available');
    }

    // Preserve original order
    const byId = new Map(questions.map((q: any) => [q.id, q]));
    const ordered = skippedQids
      .map((id: number) => byId.get(id))
      .filter(Boolean) as any[];

    const questionIds = ordered.map((q: any) => q.id);

    const minutesPerQuestion =
      original.type === 'mcq'
        ? MCQ_MINUTES_PER_QUESTION
        : CQ_MINUTES_PER_QUESTION;

    const attempt = await strapi.db.query('api::attempt.attempt').create({
      data: {
        user: user.id,
        topic: original.topic.id,
        type: original.type,
        questionIds,
        answers: null,
        startedAt: new Date().toISOString(),
      },
    });

    const sanitized = ordered.map((q: any) =>
      original.type === 'mcq'
        ? { id: q.id, text: q.text, options: q.options, citation: q.citation }
        : { id: q.id, text: q.text, marks: q.marks, citation: q.citation }
    );

    ctx.body = {
      data: {
        attemptId: attempt.documentId,
        type: original.type,
        topicName: original.topic?.name ?? 'Unknown',
        questions: sanitized,
        timeLimitSeconds: questionIds.length * minutesPerQuestion * 60,
        cycleReset: false,
      },
    };
  },




  // GET /practice/topics/:topicId/attempts
  async topicAttempts(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const { topicId } = ctx.params;
    if (!topicId) {
      throw new ValidationError('topicId is required');
    }

    const topic = await strapi.db.query('api::topic.topic').findOne({
      where: { documentId: topicId },
    });

    if (!topic) {
      throw new NotFoundError('Topic not found');
    }

    const attempts = await strapi.db.query('api::attempt.attempt').findMany({
      where: {
        user: user.id,
        topic: topic.id,
        completedAt: { $notNull: true },
      },
      orderBy: { completedAt: 'desc' },
      limit: 100,
    });

    const items = attempts.map((a: any) => ({
      attemptId: a.documentId,
      type: a.type,
      score: a.type === 'mcq' ? a.score ?? null : null,
      correctCount: a.type === 'mcq' ? a.correctCount ?? null : null,
      totalQuestions: a.totalQuestions ?? null,
      completedAt: a.completedAt,
    }));

    ctx.body = {
      data: {
        topicId: topic.documentId,
        topicName: topic.name,
        totalAttempts: items.length,
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
    mcqAttempts.forEach((a: any) =>
      (a.questionIds || []).forEach((id: any) => mcqQuestionsSolved.add(Number(id)))
    );

    const cqQuestionsSolved = new Set<number>();
    cqAttempts.forEach((a: any) =>
      (a.questionIds || []).forEach((id: any) => cqQuestionsSolved.add(Number(id)))
    );

    const topicMap = new Map<
      string,
      {
        numericId: number;
        name: string;
        attempts: number;
        solved: Set<number>;
        bestScore: number;
      }
    >();
    for (const a of mcqAttempts) {
      const key = a.topic?.documentId ?? 'unknown';
      if (!topicMap.has(key)) {
        topicMap.set(key, {
          numericId: a.topic?.id ?? 0,
          name: a.topic?.name ?? 'Unknown',
          attempts: 0,
          solved: new Set(),
          bestScore: 0,
        });
      }
      const entry = topicMap.get(key)!;
      entry.attempts += 1;
      entry.bestScore = Math.max(entry.bestScore, a.score ?? 0);
      (a.questionIds || []).forEach((id: any) => entry.solved.add(Number(id)));
    }

    const topicNumericIds = Array.from(topicMap.values())
      .map((t) => t.numericId)
      .filter((id) => id > 0);

    // Bulk fetch CURRENT question IDs per topic. This is the source of truth
    // for "how many questions exist" AND for filtering out orphan IDs from
    // old attempts that reference questions no longer linked to the topic.
    const questionIdsByTopic = new Map<number, Set<number>>();

    if (topicNumericIds.length > 0) {
      const rows = (await strapi.db
        .connection('questions_topic_lnk as qtl')
        .join('questions as q', 'qtl.question_id', 'q.id')
        .whereIn('qtl.topic_id', topicNumericIds)
        .whereNotNull('q.correct_option_index')
        .select('qtl.topic_id', 'qtl.question_id')) as any[];

      for (const row of rows) {
        const tid = Number(row.topic_id);
        if (!questionIdsByTopic.has(tid)) questionIdsByTopic.set(tid, new Set());
        questionIdsByTopic.get(tid)!.add(Number(row.question_id));
      }
    }

    // Global pool: union of all current question IDs across the topics this
    // user has attempted. Used to filter the "MCQ Solved" stat so it doesn't
    // count questions that no longer exist.
    const globalMcqPool = new Set<number>();
    for (const s of questionIdsByTopic.values()) {
      for (const id of s) globalMcqPool.add(id);
    }

    const mcqSolvedInPool = new Set<number>();
    for (const id of mcqQuestionsSolved) {
      if (globalMcqPool.has(id)) mcqSolvedInPool.add(id);
    }

    const topicProgress = Array.from(topicMap.entries()).map(([topicDocId, entry]) => {
      const pool = questionIdsByTopic.get(entry.numericId) ?? new Set<number>();
      let seenInPool = 0;
      for (const id of entry.solved) {
        if (pool.has(id)) seenInPool += 1;
      }
      return {
        topicId: topicDocId,
        name: entry.name,
        attempts: entry.attempts,
        questionsSolved: seenInPool,
        totalQuestions: pool.size,
        bestScore: entry.bestScore,
      };
    });

    const overallAvgScore = topicProgress.length
      ? Math.round(
          topicProgress.reduce((sum, t) => sum + t.bestScore, 0) /
            topicProgress.length
        )
      : 0;

    const latestByTopicMap = new Map<string, any>();
    const attemptCountByTopic = new Map<string, number>();

    for (const a of attempts) {
      if (!a.completedAt) continue;
      const key = a.topic?.documentId ?? 'unknown';
      attemptCountByTopic.set(key, (attemptCountByTopic.get(key) ?? 0) + 1);

      const existing = latestByTopicMap.get(key);
      if (
        !existing ||
        new Date(a.completedAt) > new Date(existing.completedAt)
      ) {
        latestByTopicMap.set(key, a);
      }
    }

    const latestPerTopic = Array.from(latestByTopicMap.entries())
      .map(([topicDocId, a]: [string, any]) => ({
        topicId: topicDocId,
        topicName: a.topic?.name ?? 'Unknown',
        attemptId: a.documentId,
        type: a.type,
        score: a.type === 'mcq' ? a.score ?? null : null,
        correctCount: a.type === 'mcq' ? a.correctCount ?? null : null,
        totalQuestions: a.totalQuestions ?? null,
        completedAt: a.completedAt,
        totalAttemptsOnTopic: attemptCountByTopic.get(topicDocId) ?? 1,
      }))
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

    const recentAttempts = [...attempts]
      .filter((a: any) => a.completedAt)
      .sort(
        (a: any, b: any) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
      .slice(0, 20)
      .map((a: any) => ({
        attemptId: a.documentId,
        type: a.type,
        topicName: a.topic?.name ?? 'Unknown',
        score: a.type === 'mcq' ? a.score ?? null : null,
        correctCount: a.type === 'mcq' ? a.correctCount ?? null : null,
        totalQuestions: a.totalQuestions ?? null,
        completedAt: a.completedAt,
      }));

    ctx.body = {
      data: {
        totalAttempts: attempts.length,
        mcqAttempts: mcqAttempts.length,
        cqAttempts: cqAttempts.length,
        mcqQuestionsSolved: mcqSolvedInPool.size,
        cqQuestionsSolved: cqQuestionsSolved.size,
        averageMcqScore: overallAvgScore,
        topicProgress,
        recentAttempts,
        latestPerTopic,
      },
    };
  },





  // GET /practice/topics?type=mcq|cq
  async topics(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const type = ctx.query.type === 'cq' ? 'cq' : 'mcq';

    const topics = await strapi.db.query('api::topic.topic').findMany({
      orderBy: { name: 'asc' },
      select: ['id', 'documentId', 'name', 'isFreeTrial'],
    });

    if (topics.length === 0) {
      ctx.body = { data: [] };
      return;
    }

    const topicNumericIds = topics.map((t: any) => t.id);

    // Bulk fetch CURRENT question IDs per topic.
    const questionIdsByTopic = new Map<number, Set<number>>();

    if (type === 'mcq') {
      const rows = (await strapi.db
        .connection('questions_topic_lnk as qtl')
        .join('questions as q', 'qtl.question_id', 'q.id')
        .whereIn('qtl.topic_id', topicNumericIds)
        .whereNotNull('q.correct_option_index')
        .select('qtl.topic_id', 'qtl.question_id')) as any[];

      for (const row of rows) {
        const tid = Number(row.topic_id);
        if (!questionIdsByTopic.has(tid)) questionIdsByTopic.set(tid, new Set());
        questionIdsByTopic.get(tid)!.add(Number(row.question_id));
      }
    } else {
      const rows = (await strapi.db
        .connection('written_questions_topic_lnk')
        .whereIn('topic_id', topicNumericIds)
        .select('topic_id', 'written_question_id')) as any[];

      for (const row of rows) {
        const tid = Number(row.topic_id);
        if (!questionIdsByTopic.has(tid)) questionIdsByTopic.set(tid, new Set());
        questionIdsByTopic.get(tid)!.add(Number(row.written_question_id));
      }
    }

    // Completed attempts for this user+type
    const allAttempts = await strapi.db.query('api::attempt.attempt').findMany({
      where: { user: user.id, type },
      populate: { topic: true },
    });

    const attemptsByTopic = new Map<string, any[]>();
    for (const a of allAttempts) {
      const key = a.topic?.documentId ?? 'unknown';
      if (!attemptsByTopic.has(key)) attemptsByTopic.set(key, []);
      attemptsByTopic.get(key)!.push(a);
    }

    // Bulk fetch which topics this user has any attempt on
    const usedFreeTrialSet = new Set<number>();

    if (topicNumericIds.length > 0) {
      const usedRows = (await strapi.db
        .connection('attempts_user_lnk as ul')
        .join('attempts_topic_lnk as tl', 'ul.attempt_id', 'tl.attempt_id')
        .whereIn('tl.topic_id', topicNumericIds)
        .where('ul.user_id', user.id)
        .groupBy('tl.topic_id')
        .select('tl.topic_id')) as any[];

      for (const row of usedRows) {
        usedFreeTrialSet.add(Number(row.topic_id));
      }
    }

    const result = topics.map((topic: any) => {
      const attempts = attemptsByTopic.get(topic.documentId) ?? [];
      const pool = questionIdsByTopic.get(topic.id) ?? new Set<number>();

      const seenIds = new Set<number>();
      for (const a of attempts) {
        (a.questionIds || []).forEach((id: any) => seenIds.add(Number(id)));
      }

      // Intersect: only count IDs that still belong to this topic
      let seenInPool = 0;
      for (const id of seenIds) {
        if (pool.has(id)) seenInPool += 1;
      }

      return {
        topicId: topic.documentId,
        name: topic.name,
        totalQuestions: pool.size,
        seenCount: seenInPool,
        attemptCount: attempts.length,
        lastAttemptAt: attempts.length
          ? attempts.reduce(
              (latest: string, a: any) =>
                a.startedAt > latest ? a.startedAt : latest,
              attempts[0].startedAt
            )
          : null,
        isFreeTrial: !!topic.isFreeTrial,
        hasUsedFreeTrial: usedFreeTrialSet.has(topic.id),
      };
    });

    ctx.body = { data: result };
  },
};
