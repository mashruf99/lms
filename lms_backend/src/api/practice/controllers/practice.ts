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
    await assertActiveSubscription(strapi, user);

    const { topicId, type } = ctx.request.body;

    if (!topicId || !['mcq', 'cq'].includes(type)) {
      throw new ValidationError('topicId and type (mcq|cq) are required');
    }

    const topic = await strapi.db.query('api::topic.topic').findOne({
      where: { documentId: topicId },
      select: ['id', 'name'],
    });
    if (!topic) {
      throw new NotFoundError('Topic not found');
    }

    const blockSize = type === 'mcq' ? MCQ_BLOCK_SIZE : CQ_BLOCK_SIZE;
    const minutesPerQuestion = type === 'mcq' ? MCQ_MINUTES_PER_QUESTION : CQ_MINUTES_PER_QUESTION;





    // Fetch only the fields we return to the client. Omitting `explanation`,
    // audit columns, and other unused fields saves bytes and Postgres work
    // on topics with 2,000+ questions.
    const allQuestions =
      type === 'mcq'
        ? await strapi.db.query('api::question.question').findMany({
            where: { topic: topic.id, correctOptionIndex: { $notNull: true } },
            select: ['id', 'text', 'options', 'citation'],
          })
        : await strapi.db.query('api::written-question.written-question').findMany({
            where: { topic: topic.id },
            select: ['id', 'text', 'marks', 'citation'],
          });

    if (allQuestions.length === 0) {
      throw new ValidationError('No questions available for this topic yet');
    }




    // Find questions this user has already seen for this topic+type
    // Only questionIds is used below. This skips loading the `answers` JSON
    // blob for every prior attempt — meaningful when a user has dozens of
    // attempts on a topic.

    const priorAttempts = await strapi.db.query('api::attempt.attempt').findMany({
      where: { user: user.id, topic: topic.id, type },
      select: ['questionIds'],
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
    await assertActiveSubscription(strapi, user);

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
      // Only id + correctOptionIndex are needed for grading. Previously this
      // fetched full question rows including text/options/explanation/audit
      // columns — 30 × ~2KB = 60 KB per submit that went u

      const questions = await strapi.db.query('api::question.question').findMany({
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

      // Only include questions the student actually answered.
      // Unanswered questions are deliberately hidden in review so a user
      // cannot start a session, answer 2, and see the answer key for 28.
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

      const totalQuestions = attempt.totalQuestions ?? attempt.questionIds.length;
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
    const questions = await strapi.db.query('api::written-question.written-question').findMany({
      where: { id: { $in: attempt.questionIds } },
    });
    const byId = new Map(questions.map((q: any) => [q.id, q]));

    // Only include CQ questions where the student actually wrote something.
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






  // GET /practice/topics/:topicId/attempts
  // Returns all completed attempts for the logged-in user on one topic.
  // Uses assertApproved (not assertActiveSubscription) — Option B: expired
  // users can still view their past work.
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
    mcqAttempts.forEach((a: any) => (a.questionIds || []).forEach((id: number) => mcqQuestionsSolved.add(id)));

    const cqQuestionsSolved = new Set<number>();
    cqAttempts.forEach((a: any) => (a.questionIds || []).forEach((id: number) => cqQuestionsSolved.add(id)));

   

      const topicMap = new Map<
      string,
      { numericId: number; name: string; attempts: number; solved: Set<number>; bestScore: number }
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
      (a.questionIds || []).forEach((id: number) => entry.solved.add(id));
    }







       // One bulk query replaces 2N individual queries (findOne topic + count per topic).
    // Strapi 5 stores manyToOne relations in link tables, so we join through
    // questions_topic_lnk to get the topic → question count mapping.
    const topicNumericIds = Array.from(topicMap.values())
      .map((t) => t.numericId)
      .filter((id) => id > 0);

    const questionCountByTopic: Record<number, number> = {};

    if (topicNumericIds.length > 0) {
      const rows = (await strapi.db
        .connection('questions_topic_lnk as qtl')
        .join('questions as q', 'qtl.question_id', 'q.id')
        .whereIn('qtl.topic_id', topicNumericIds)
        .whereNotNull('q.correct_option_index')
        .groupBy('qtl.topic_id')
        .select('qtl.topic_id')
        .count('* as count')) as any[];

      for (const row of rows) {
        questionCountByTopic[Number(row.topic_id)] = Number(row.count);
      }
    }

    const topicProgress = Array.from(topicMap.entries()).map(([topicDocId, entry]) => ({
      topicId: topicDocId,
      name: entry.name,
      attempts: entry.attempts,
      questionsSolved: entry.solved.size,
      totalQuestions: questionCountByTopic[entry.numericId] ?? 0,
      bestScore: entry.bestScore,
    }));



    const overallAvgScore = topicProgress.length
      ? Math.round(topicProgress.reduce((sum, t) => sum + t.bestScore, 0) / topicProgress.length)
      : 0;


        // Latest completed attempt per topic — one entry per topic (not per attempt).
    // Used by the dashboard "Latest by Topic" section.
    const latestByTopicMap = new Map<string, any>();
    const attemptCountByTopic = new Map<string, number>();

    for (const a of attempts) {
      if (!a.completedAt) continue;
      const key = a.topic?.documentId ?? 'unknown';

      attemptCountByTopic.set(key, (attemptCountByTopic.get(key) ?? 0) + 1);

      const existing = latestByTopicMap.get(key);
      if (!existing || new Date(a.completedAt) > new Date(existing.completedAt)) {
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




        // Recent attempts (latest first, capped at 20) — used by the dashboard
    // to show links to review pages. Only completed attempts are included.
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
        mcqQuestionsSolved: mcqQuestionsSolved.size,
        cqQuestionsSolved: cqQuestionsSolved.size,
        averageMcqScore: overallAvgScore,
        topicProgress,
        recentAttempts,
        latestPerTopic,
      },
    };




  },

  async topics(ctx: any) {
    const user = ctx.state.user;
    await assertApproved(strapi, user);

    const type = ctx.query.type === 'cq' ? 'cq' : 'mcq';

    const topics = await strapi.db.query('api::topic.topic').findMany({
      orderBy: { name: 'asc' },
    });

    if (topics.length === 0) {
      ctx.body = { data: [] };
      return;
    }

    const topicNumericIds = topics.map((t: any) => t.id);
    const questionCountByTopic: Record<number, number> = {};

    if (type === 'mcq') {
      const rows = (await strapi.db
        .connection('questions_topic_lnk as qtl')
        .join('questions as q', 'qtl.question_id', 'q.id')
        .whereIn('qtl.topic_id', topicNumericIds)
        .whereNotNull('q.correct_option_index')
        .groupBy('qtl.topic_id')
        .select('qtl.topic_id')
        .count('* as count')) as any[];

      for (const row of rows) {
        questionCountByTopic[Number(row.topic_id)] = Number(row.count);
      }
    } else {
      const rows = (await strapi.db
        .connection('written_questions_topic_lnk')
        .whereIn('topic_id', topicNumericIds)
        .groupBy('topic_id')
        .select('topic_id')
        .count('* as count')) as any[];

      for (const row of rows) {
        questionCountByTopic[Number(row.topic_id)] = Number(row.count);
      }
    }

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

    const result = topics.map((topic: any) => {
      const attempts = attemptsByTopic.get(topic.documentId) ?? [];

      const seenIds = new Set<number>();
      for (const a of attempts) {
        (a.questionIds || []).forEach((id: number) => seenIds.add(id));
      }

      return {
        topicId: topic.documentId,
        name: topic.name,
        totalQuestions: questionCountByTopic[topic.id] ?? 0,
        seenCount: seenIds.size,
        attemptCount: attempts.length,
        lastAttemptAt: attempts.length
          ? attempts.reduce(
              (latest: string, a: any) =>
                a.startedAt > latest ? a.startedAt : latest,
              attempts[0].startedAt
            )
          : null,
      };
    });

    ctx.body = { data: result };
  },
};
