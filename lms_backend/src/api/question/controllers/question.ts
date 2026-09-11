/**
 * question controller
 */
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ForbiddenError, ValidationError } = errors;

export default factories.createCoreController('api::question.question', ({ strapi }) => ({
  async needsAnswer(ctx: any) {
    const user = ctx.state.user;

    if (!user || user.role?.name !== 'Admin') {
      throw new ForbiddenError('Only Admin can access this');
    }

    const page = Number(ctx.query.page) || 1;
    const pageSize = Number(ctx.query.pageSize) || 25;
    const topicId = ctx.query.topicId;

    const where: any = { correctOptionIndex: null };
    if (topicId) {
      where.topic = topicId;
    }

    const [questions, total] = await Promise.all([
      strapi.db.query('api::question.question').findMany({
        where,
        populate: { topic: true },
        orderBy: { id: 'asc' },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      strapi.db.query('api::question.question').count({ where }),
    ]);

    ctx.body = {
      data: questions,
      meta: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  async setAnswer(ctx: any) {
    const user = ctx.state.user;

    if (!user || user.role?.name !== 'Admin') {
      throw new ForbiddenError('Only Admin can set answers');
    }

    const { id } = ctx.params;
    const { correctOptionIndex, explanation } = ctx.request.body;

    if (correctOptionIndex === undefined || correctOptionIndex === null) {
      throw new ValidationError('correctOptionIndex is required');
    }

    const question = await strapi.db.query('api::question.question').findOne({
      where: { documentId: id },
    });

    if (!question) {
      throw new ValidationError('Question not found');
    }

    if (
      typeof correctOptionIndex !== 'number' ||
      correctOptionIndex < 0 ||
      correctOptionIndex >= (question.options?.length ?? 0)
    ) {
      throw new ValidationError('correctOptionIndex out of range for this question\'s options');
    }

    const updated = await strapi.db.query('api::question.question').update({
      where: { id: question.id },
      data: {
        correctOptionIndex,
        explanation: explanation ?? question.explanation,
      },
    });

    ctx.body = { data: updated };
  },
}));
