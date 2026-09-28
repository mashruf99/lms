export default {
  routes: [
    {
      method: 'GET',
      path: '/public/topics',
      handler: 'public.topics',
      config: {
        policies: [],
        auth: false,   // ← truly public — no JWT required
      },
      info: {
        apiName: 'public',
        type: 'content-api',
      },
    },
  ],
};
