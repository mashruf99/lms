export default {
  routes: [
    {
      method: 'GET',
      path: '/my-enrollments',
      handler: 'enrollment.myEnrollments',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'enrollment',
        type: 'content-api',
      },
    },
  ],
};
