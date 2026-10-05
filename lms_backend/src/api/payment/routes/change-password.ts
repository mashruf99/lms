export default {
  routes: [
    {
      method: 'POST',
      path: '/user/change-password-custom',
      handler: 'change-password.changePassword',
      config: {
        policies: [],
        // auth: false — we verify the JWT manually inside the controller
        // to sidestep the users-permissions plugin's flaky permission
        // sync in Strapi 5.52.
        auth: false,
      },
      info: {
        apiName: 'payment',
        type: 'content-api',
      },
    },
  ],
};
