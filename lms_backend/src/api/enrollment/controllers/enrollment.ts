/**
 * enrollment controller
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  async myEnrollments(ctx: any) {
    const user = ctx.state.user;

    if (!user) {
      ctx.status = 401;
      ctx.body = { data: [] };
      return;
    }

    const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: { student: user.id },
      populate: { course: true },
    });

    ctx.body = { data: enrollments };
  },
}));
