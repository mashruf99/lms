export default {
  routes: [
    {
      method: 'POST',
      path: '/submit-quiz',
      handler: 'quiz-result.submit',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'quiz-result',
        type: 'content-api',
      },
    },
    {
      method: 'GET',
      path: '/my-quiz-results',
      handler: 'quiz-result.myResults',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'quiz-result',
        type: 'content-api',
      },
    },
  ],
};
