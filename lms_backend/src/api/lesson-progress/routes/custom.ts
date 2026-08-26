export default {
  routes: [
    {
      method: 'GET',
      path: '/my-progress',
      handler: 'lesson-progress.myProgress',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'lesson-progress',
        type: 'content-api',
      },
    },
    {
      method: 'POST',
      path: '/mark-complete',
      handler: 'lesson-progress.markComplete',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'lesson-progress',
        type: 'content-api',
      },
    },
  ],
};
