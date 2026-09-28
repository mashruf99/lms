// @ts-ignore - koa-ratelimit has no bundled type declarations
import rateLimit from 'koa-ratelimit';

const authDb = new Map();
const registerDb = new Map();
const generalDb = new Map();

const authLimiter = rateLimit({
  driver: 'memory',
  db: authDb,
  duration: 15 * 60 * 1000,
  max: 10,
  errorMessage: 'Too many login attempts. Please try again later.',
  id: (ctx: any) => ctx.ip,
});

const registerLimiter = rateLimit({
  driver: 'memory',
  db: registerDb,
  duration: 60 * 60 * 1000,
  max: 6,
  errorMessage: 'Too many accounts created from this network. Please try again later.',
  id: (ctx: any) => ctx.ip,
});

const generalLimiter = rateLimit({
  driver: 'memory',
  db: generalDb,
  duration: 60 * 1000,
  max: 300,
  errorMessage: 'Too many requests. Please slow down.',
  id: (ctx: any) => ctx.ip,
});

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    const path = ctx.request.path;

    if (path.startsWith('/admin')) {
      return next();
    }

    if (path === '/api/auth/local') {
      return authLimiter(ctx, next);
    }

    if (path === '/api/auth/local/register') {
      return registerLimiter(ctx, next);
    }

    if (path.startsWith('/api/')) {
      return generalLimiter(ctx, next);
    }

    return next();
  };
};
