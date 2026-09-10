/**
 * question controller
 */
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ForbiddenError } = errors;

export default factories.createCoreController('api::question.question', ({ strapi }) => ({
  async needsAnswer(ctx: any) {
    const user = ctx.state.user;

    if (!user || user.role?.name !== 'Admin') {
      throw new ForbiddenError('Only Admin can access this');
    }

    const page = Number(ctx.query.page) || 1;
    const pageSize = Number(ctx.query.pageSize) || 25;

    const [questions, total] = await Promise.all([
      strapi.db.query('api::question.question').findMany({
        where: { correctOptionIndex: null },
        populate: { topic: true },
        orderBy: { id: 'asc' },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      strapi.db.query('api::question.question').count({
        where: { correctOptionIndex: null },
      }),
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
}));
