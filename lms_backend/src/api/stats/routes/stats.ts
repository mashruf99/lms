export default {
  routes: [
    {
      method: 'GET',
      path: '/stats/overview',
      handler: 'stats.overview',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'stats',
        type: 'content-api',
      },
    },
  ],
};
