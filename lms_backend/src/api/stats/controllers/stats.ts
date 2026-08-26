export default {
  async overview(ctx: any) {
    const user = ctx.state.user;

    if (!user || user.role?.name !== 'Admin') {
      ctx.status = 403;
      ctx.body = { error: 'Forbidden' };
      return;
    }

    const allUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
      populate: { role: true },
    });

    const usersByRole: Record<string, number> = {};
    for (const u of allUsers) {
      const roleName = u.role?.name ?? 'Unknown';
      usersByRole[roleName] = (usersByRole[roleName] ?? 0) + 1;
    }

    const totalCourses = await strapi.db.query('api::course.course').count();
    const totalEnrollments = await strapi.db.query('api::enrollment.enrollment').count();
    const totalLessons = await strapi.db.query('api::lesson.lesson').count();
    const totalQuizzes = await strapi.db.query('api::quiz.quiz').count();
    const totalBlogPosts = await strapi.db.query('api::blog-post.blog-post').count();

    ctx.body = {
      data: {
        usersByRole,
        totalUsers: allUsers.length,
        totalCourses,
        totalEnrollments,
        totalLessons,
        totalQuizzes,
        totalBlogPosts,
      },
    };
  },
};
