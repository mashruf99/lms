export default {
  async me(ctx: any) {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = { user: null };
      return;
    }

    const fullUser = await strapi.documents('plugin::users-permissions.user').findOne({
      documentId: ctx.state.user.documentId,
      populate: ['role'],
    });

    if (!fullUser) {
      ctx.status = 404;
      ctx.body = { user: null };
      return;
    }

    const { password, resetPasswordToken, confirmationToken, ...safeUser } = fullUser as any;

    ctx.body = { user: safeUser };
  },
};
