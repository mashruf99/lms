export default {
  routes: [
    {
      method: 'GET',
      path: '/practice/topics',
      handler: 'practice.topics',
      config: { policies: [], auth: {} },
      info: { apiName: 'practice', type: 'content-api' },
    },
    {
      method: 'POST',
      path: '/practice/start',
      handler: 'practice.start',
      config: { policies: [], auth: {} },
      info: { apiName: 'practice', type: 'content-api' },
    },
        {
      method: 'GET',
      path: '/practice/topics/:topicId/attempts',
      handler: 'practice.topicAttempts',
      config: { policies: [], auth: {} },
      info: { apiName: 'practice', type: 'content-api' },
    },
    {
      method: 'POST',
      path: '/practice/submit',
      handler: 'practice.submit',
      config: { policies: [], auth: {} },
      info: { apiName: 'practice', type: 'content-api' },
    },
    {
      method: 'GET',
      path: '/practice/attempt/:id/review',
      handler: 'practice.review',
      config: { policies: [], auth: {} },
      info: { apiName: 'practice', type: 'content-api' },
    },
    {
      method: 'GET',
      path: '/practice/dashboard',
      handler: 'practice.dashboard',
      config: { policies: [], auth: {} },
      info: { apiName: 'practice', type: 'content-api' },
    },
  ],
};
