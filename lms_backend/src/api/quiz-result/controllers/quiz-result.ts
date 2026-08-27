/**
 * quiz-result controller
 */
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ApplicationError, ForbiddenError } = errors;

export default factories.createCoreController('api::quiz-result.quiz-result', ({ strapi }) => ({
  async submit(ctx: any) {
    const user = ctx.state.user;
    const { quizId, answers } = ctx.request.body;

    if (!user) {
      ctx.status = 401;
      ctx.body = { error: 'Not authenticated' };
      return;
    }

    if (!quizId || !answers || typeof answers !== 'object') {
      ctx.status = 400;
      ctx.body = { error: 'quizId and answers are required' };
      return;
    }

    const quiz = await strapi.db.query('api::quiz.quiz').findOne({
      where: { id: quizId },
      populate: { course: true },
    });

    if (!quiz) {
      ctx.status = 404;
      ctx.body = { error: 'Quiz not found' };
      return;
    }

    const enrollment = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: { student: user.id, course: quiz.course?.id },
    });

    if (enrollment.length === 0) {
      throw new ForbiddenError('You must be enrolled in this course to take this quiz');
    }

    const existingResult = await strapi.db.query('api::quiz-result.quiz-result').findMany({
      where: { student: user.id, quiz: quizId },
    });

    if (existingResult.length > 0) {
      throw new ApplicationError('You have already taken this quiz');
    }

    const questions = await strapi.db.query('api::question.question').findMany({
      where: { quiz: quizId },
    });

    if (questions.length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'This quiz has no questions' };
      return;
    }

    let correctCount = 0;

    for (const question of questions) {
      const submittedIndex = answers[question.id];
      if (submittedIndex === question.correctOptionIndex) {
        correctCount += 1;
      }
    }

    const score = Math.round((correctCount / questions.length) * 100);

    const result = await strapi.db.query('api::quiz-result.quiz-result').create({
      data: {
        student: user.id,
        quiz: quizId,
        score,
        answers,
        submittedAt: new Date().toISOString(),
      },
    });

    ctx.body = {
      data: {
        ...result,
        correctCount,
        totalQuestions: questions.length,
      },
    };
  },

  async myResults(ctx: any) {
    const user = ctx.state.user;

    if (!user) {
      ctx.status = 401;
      ctx.body = { data: [] };
      return;
    }

    const results = await strapi.db.query('api::quiz-result.quiz-result').findMany({
      where: { student: user.id },
      populate: { quiz: true },
    });

    ctx.body = { data: results };
  },
}));
