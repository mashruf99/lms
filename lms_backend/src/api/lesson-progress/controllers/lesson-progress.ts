/**
 * lesson-progress controller
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lesson-progress.lesson-progress', ({ strapi }) => ({
  async myProgress(ctx: any) {
    const user = ctx.state.user;

    if (!user) {
      ctx.status = 401;
      ctx.body = { data: [] };
      return;
    }

    const progress = await strapi.db.query('api::lesson-progress.lesson-progress').findMany({
      where: { student: user.id },
      populate: { lesson: true },
    });

    ctx.body = { data: progress };
  },

  async markComplete(ctx: any) {
    const user = ctx.state.user;
    const { lessonId } = ctx.request.body;

    if (!user) {
      ctx.status = 401;
      ctx.body = { error: 'Not authenticated' };
      return;
    }

    if (!lessonId) {
      ctx.status = 400;
      ctx.body = { error: 'lessonId is required' };
      return;
    }

    const existing = await strapi.db.query('api::lesson-progress.lesson-progress').findMany({
      where: { student: user.id, lesson: lessonId },
    });

    if (existing.length > 0) {
      const updated = await strapi.db.query('api::lesson-progress.lesson-progress').update({
        where: { id: existing[0].id },
        data: { completed: true, completedAt: new Date().toISOString() },
      });
      ctx.body = { data: updated };
      return;
    }

    const created = await strapi.db.query('api::lesson-progress.lesson-progress').create({
      data: {
        student: user.id,
        lesson: lessonId,
        completed: true,
        completedAt: new Date().toISOString(),
      },
    });

    ctx.body = { data: created };
  },
}));
