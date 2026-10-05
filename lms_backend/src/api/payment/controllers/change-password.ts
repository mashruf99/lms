import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

export default {
  /**
   * POST /api/user/change-password-custom
   *
   * Custom endpoint that bypasses Strapi's content-api permission system
   * entirely. Route is auth: false — we verify the JWT manually here.
   *
   * Body: { currentPassword, password, passwordConfirmation }
   */
  async changePassword(ctx: any) {
    // ─── Manual JWT extraction & verification ───
    const authHeader = ctx.request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = { error: 'Not authenticated' };
      return;
    }

    const token = authHeader.slice(7);

    let payload: any;
    try {
      payload = await strapi.plugin('users-permissions').service('jwt').verify(token);
    } catch {
      ctx.status = 401;
      ctx.body = { error: 'Invalid or expired token' };
      return;
    }

    if (!payload?.id) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid token payload' };
      return;
    }

    const userId = Number(payload.id);

    // ─── Validate input ───
    const { currentPassword, password, passwordConfirmation } = ctx.request.body ?? {};

    if (!currentPassword || !password || !passwordConfirmation) {
      ctx.status = 400;
      ctx.body = { error: 'currentPassword, password and passwordConfirmation are required' };
      return;
    }

    if (password.length < 6) {
      ctx.status = 400;
      ctx.body = { error: 'New password must be at least 6 characters' };
      return;
    }

    if (password !== passwordConfirmation) {
      ctx.status = 400;
      ctx.body = { error: 'New passwords do not match' };
      return;
    }

    // ─── Load user with password hash ───
    const fullUser = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({
        where: { id: userId },
        select: ['id', 'password'],
      });

    if (!fullUser) {
      throw new ApplicationError('User not found');
    }

    // ─── Verify current password ───
    const userService = strapi.plugin('users-permissions').service('user');
    const validPassword = await userService.validatePassword(
      currentPassword,
      fullUser.password
    );

    if (!validPassword) {
      ctx.status = 400;
      ctx.body = { error: 'The provided current password is invalid' };
      return;
    }


    // ─── Hash and save new password ───
    // Use bcryptjs directly — Strapi's users-permissions plugin uses it
    // internally, so the hash format is identical. The plugin does not
    // expose a public hashPassword method in Strapi 5.52.
    const bcrypt = require('bcryptjs');
    const newHash = await bcrypt.hash(password, 10);

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { password: newHash },
    });

    ctx.body = { ok: true };




  },
};
