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
    const usersByApproval: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const u of allUsers) {
      const roleName = u.role?.name ?? 'Unknown';
      usersByRole[roleName] = (usersByRole[roleName] ?? 0) + 1;
      const status = u.approvalStatus ?? 'pending';
      usersByApproval[status] = (usersByApproval[status] ?? 0) + 1;
    }

    const totalTopics = await strapi.db.query('api::topic.topic').count();
    const totalQuestions = await strapi.db.query('api::question.question').count();
    const totalUnansweredQuestions = await strapi.db.query('api::question.question').count({
      where: { correctOptionIndex: null },
    });
    const totalAttempts = await strapi.db.query('api::attempt.attempt').count();
    const totalBlogPosts = await strapi.db.query('api::blog-post.blog-post').count();

    ctx.body = {
      data: {
        usersByRole,
        usersByApproval,
        totalUsers: allUsers.length,
        totalTopics,
        totalQuestions,
        totalUnansweredQuestions,
        totalAttempts,
        totalBlogPosts,
      },
    };
  },
};
