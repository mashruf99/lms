/**
 * Admin-only controller for approving/rejecting payments.
 *
 * Accepts two auth paths:
 *   1. A Users & Permissions user whose role.name === 'Admin'
 *   2. A Strapi API token
 *
 * Strapi populates ctx.state.user only for (1). For (2) it populates
 * ctx.state.auth.credentials instead. We check both.
 */

function isAuthorized(ctx: any): boolean {
  const user = ctx.state.user;

  // Path 1 — logged-in Users & Permissions user with the Admin role
  if (user && user.role?.name === 'Admin') {
    return true;
  }

  // Path 2 — Strapi API token
  const auth = ctx.state.auth;
  if (auth?.credentials) {
    const type = auth.credentials.type;
    // Strapi 5 API token types: 'read-only' | 'full-access' | 'custom'
    if (type === 'full-access') return true;
    if (type === 'custom') return true;
  }

  return false;
}

export default {
  async approve(ctx: any) {
    if (!isAuthorized(ctx)) {
      ctx.status = 403;
      ctx.body = { error: 'Forbidden — Admin only' };
      return;
    }

    const { id } = ctx.params;

    if (!id) {
      ctx.status = 400;
      ctx.body = { error: 'Payment documentId is required' };
      return;
    }

    const adminId = ctx.state.user?.id ?? null;

    try {
      const result = await strapi
        .service('api::payment.approval')
        .approvePayment(strapi, id, adminId);

      ctx.body = { data: result };
    } catch (err: any) {
      ctx.status = err.status ?? 500;
      ctx.body = {
        error: err.message ?? 'Failed to approve payment',
      };
    }
  },

  async reject(ctx: any) {
    if (!isAuthorized(ctx)) {
      ctx.status = 403;
      ctx.body = { error: 'Forbidden — Admin only' };
      return;
    }

    const { id } = ctx.params;

    if (!id) {
      ctx.status = 400;
      ctx.body = { error: 'Payment documentId is required' };
      return;
    }

    const reason = ctx.request.body?.reason;
    const adminId = ctx.state.user?.id ?? null;

    try {
      const result = await strapi
        .service('api::payment.approval')
        .rejectPayment(strapi, id, adminId, reason);

      ctx.body = { data: result };
    } catch (err: any) {
      ctx.status = err.status ?? 500;
      ctx.body = {
        error: err.message ?? 'Failed to reject payment',
      };
    }
  },
};
