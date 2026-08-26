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
    },
  ],
};
