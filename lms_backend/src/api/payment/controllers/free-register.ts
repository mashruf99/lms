import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

type CleanInput = {
  username: string;
  email: string;
  password: string;
};

function validateInput(body: any): { valid: boolean; errors: string[]; clean: CleanInput } {
  const errors: string[] = [];

  const clean: CleanInput = {
    username: String(body?.username ?? '').trim(),
    email: String(body?.email ?? '').trim().toLowerCase(),
    password: String(body?.password ?? ''),
  };

  if (clean.username.length < 3) errors.push('Username must be at least 3 characters.');
  if (!EMAIL_REGEX.test(clean.email)) errors.push('A valid email is required.');
  if (clean.password.length < 6) errors.push('Password must be at least 6 characters.');

  return { valid: errors.length === 0, errors, clean };
}

export default {
  /**
   * POST /api/auth/register-free
   *
   * Public endpoint. Creates a user with:
   *   - approvalStatus: 'approved'  (auto-approved, no admin verification)
   *   - accessExpiresAt: null       (no active subscription yet)
   *
   * Returns a JWT so the user is logged in immediately after signup.
   *
   * Payment is NOT required at signup. The user subscribes later via
   * /api/payments/renew (or the standard payment queue), which sets
   * accessExpiresAt when admin approves.
   */
  async registerFree(ctx: any) {
    const parsed = validateInput(ctx.request.body);

    if (!parsed.valid) {
      ctx.status = 400;
      ctx.body = { error: parsed.errors[0], details: parsed.errors };
      return;
    }

    const { username, email, password } = parsed.clean;

    // Pre-check duplicates for clean error messages
    const existingUsername = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (existingUsername) {
      ctx.status = 400;
      ctx.body = { error: 'Username is already taken.' };
      return;
    }

    const existingEmail = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { email } });

    if (existingEmail) {
      ctx.status = 400;
      ctx.body = { error: 'An account with this email already exists.' };
      return;
    }

    // Find the Student role (fall back to authenticated if student not configured)
    let role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'student' } });

    if (!role) {
      role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });
    }

    if (!role) {
      throw new ApplicationError('No assignable role configured.');
    }

    let user: any;
    try {
      user = await strapi.plugin('users-permissions').service('user').add({
        username,
        email,
        password,
        provider: 'local',
        confirmed: true,
        blocked: false,
        role: role.id,
        approvalStatus: 'approved',   // ← auto-approved
      });
    } catch (err: any) {
      strapi.log.error('[register-free] user creation failed:', err);
      ctx.status = 400;
      ctx.body = { error: err?.message || 'Failed to create account.' };
      return;
    }

    // Issue a JWT so the user is logged in immediately.
    const jwt = strapi.plugin('users-permissions').service('jwt').issue({
      id: user.id,
    });

    // Do NOT return a JWT here. The frontend will follow up with a
    // standard call to /api/auth/login (via /api/auth/login route in
    // Next.js) which sets the httpOnly cookie correctly and runs the
    // approval-status check. That path is already tested and safe.
    ctx.body = {
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          approvalStatus: 'approved',
          accessExpiresAt: null,
        },
        message:
          'Account created. You can log in immediately.',
      },
    };
  },
};
