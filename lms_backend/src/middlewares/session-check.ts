function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    const authHeader = ctx.request.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);
    const payload = decodeJwtPayload(token);

    if (!payload?.sessionId) {
      return next();
    }

    try {
      const knex = strapi.db.connection;
      const session = await knex('strapi_sessions')
        .where({ session_id: payload.sessionId })
        .first();

      if (session && session.status === 'revoked') {
        ctx.status = 401;
        ctx.body = {
          data: null,
          error: {
            status: 401,
            name: 'UnauthorizedError',
            message: 'Session revoked — logged in elsewhere',
            details: {},
          },
        };
        return;
      }
    } catch (err) {
      strapi.log.error('session-check middleware error:', err);
    }

    return next();
  };
};
