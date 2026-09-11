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
    {
      method: 'PUT',
      path: '/questions/:id/set-answer',
      handler: 'question.setAnswer',
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
