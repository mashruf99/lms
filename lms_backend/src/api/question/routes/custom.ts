export default {
  routes: [
    {
      method: 'GET',
      path: '/questions/needs-answer',
      handler: 'question.needsAnswer',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'question',
        type: 'content-api',
      },
    },
  ],
};
