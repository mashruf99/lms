// @ts-ignore - koa-ratelimit has no bundled type declarations
import rateLimit from 'koa-ratelimit';

const authDb = new Map();
const registerDb = new Map();
const generalDb = new Map();

/**
 * Resolve the identity key used for rate limiting.
 *
 * Trust hierarchy:
 *   1. If the request carries our internal shared secret AND a client IP in
 *      X-Forwarded-For, use that client IP. This is the legitimate path from
 *      our Next.js proxy which sits in front of the browser.
 *   2. Otherwise use the socket IP (ctx.ip). This prevents a caller from
 *      spoofing X-Forwarded-For by hitting Strapi directly.
 *
 * Result format: `ip:<address>` — kept stable so limits remain per-IP.
 */
function getKey(ctx: any): string {
  const envSecret = process.env.INTERNAL_API_SECRET;
  const providedSecret = ctx.request.headers['x-internal-secret'];
  const forwarded = ctx.request.headers['x-forwarded-for'];

  if (envSecret && providedSecret === envSecret && typeof forwarded === 'string') {
    const realIp = forwarded.split(',')[0]?.trim();
    if (realIp) return `ip:${realIp}`;
  }

  return `ip:${ctx.ip}`;
}

const authLimiter = rateLimit({
  driver: 'memory',
  db: authDb,
  duration: 15 * 60 * 1000,
  max: 10,
  errorMessage: 'Too many login attempts. Please try again later.',
  id: (ctx: any) => getKey(ctx),
});

const registerLimiter = rateLimit({
  driver: 'memory',
  db: registerDb,
  duration: 60 * 60 * 1000,
  max: 6,
  errorMessage: 'Too many accounts created from this network. Please try again later.',
  id: (ctx: any) => getKey(ctx),
});

const generalLimiter = rateLimit({
  driver: 'memory',
  db: generalDb,
  duration: 60 * 1000,
  max: 300,
  errorMessage: 'Too many requests. Please slow down.',
  id: (ctx: any) => getKey(ctx),
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
