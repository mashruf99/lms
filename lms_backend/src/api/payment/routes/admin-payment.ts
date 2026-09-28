/**
 * Admin-only routes for payment approval/rejection.
 *
 * Note: these live at /api/payments/:id/approve and /api/payments/:id/reject
 * (content-api routes), NOT under /api/admin/... which is reserved for
 * Strapi's own admin panel API.
 *
 * The controller enforces ctx.state.user.role?.name === 'Admin'.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/payments/:id/approve',
      handler: 'admin-payment.approve',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'payment',
        type: 'content-api',
      },
    },
    {
      method: 'POST',
      path: '/payments/:id/reject',
      handler: 'admin-payment.reject',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'payment',
        type: 'content-api',
      },
    },
  ],
};
