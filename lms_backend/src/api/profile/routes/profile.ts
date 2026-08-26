export default {
  routes: [
    {
      method: 'GET',
      path: '/my-profile',
      handler: 'profile.me',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'profile',
        type: 'content-api',
      },
    },
  ],
};
