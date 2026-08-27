export default {
  routes: [
    {
      method: 'GET',
      path: '/course-progress/:courseId',
      handler: 'course-progress.forCourse',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'course-progress',
        type: 'content-api',
      },
    },
  ],
};
