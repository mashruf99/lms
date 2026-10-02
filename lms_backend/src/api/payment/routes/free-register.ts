export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/register-free',
      handler: 'free-register.registerFree',
      config: {
        policies: [],
        auth: false, // truly public — no JWT needed
      },
      info: {
        apiName: 'payment',
        type: 'content-api',
      },
    },
  ],
};

