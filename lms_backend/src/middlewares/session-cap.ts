const MAX_CONCURRENT_SESSIONS = 2;

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    await next();

    if (ctx.request.path !== '/api/auth/local' || ctx.status !== 200) {
      return;
    }

    const userId = ctx.body?.user?.id;
    if (!userId) return;

    try {
      const knex = strapi.db.connection;

      const sessions = await knex('strapi_sessions')
        .where({
          user_id: String(userId),
          origin: 'users-permissions',
          type: 'refresh',
          status: 'active',
        })
        .orderBy('created_at', 'desc');

      if (sessions.length > MAX_CONCURRENT_SESSIONS) {
        const toRevokeIds = sessions.slice(MAX_CONCURRENT_SESSIONS).map((s: any) => s.id);

        await knex('strapi_sessions')
          .whereIn('id', toRevokeIds)
          .update({ status: 'revoked' });

        strapi.log.info(`[session-cap] revoked ${toRevokeIds.length} old session(s) for user ${userId}`);
      }
    } catch (err) {
      strapi.log.error('session-cap middleware error:', err);
    }
  };
};
