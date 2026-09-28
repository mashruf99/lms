export default {
  routes: [
    {
      method: 'POST',
      path: '/payments/renew',
      handler: 'renew.renew',
      config: {
        policies: [],
        auth: {}, // requires an authenticated user (JWT)
      },
      info: {
        apiName: 'payment',
        type: 'content-api',
      },
    },
  ],
};
