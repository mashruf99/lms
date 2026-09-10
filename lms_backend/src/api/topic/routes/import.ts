export default {
  routes: [
    {
      method: 'POST',
      path: '/topics/import-markdown',
      handler: 'topic.importMarkdown',
      config: {
        policies: [],
        auth: {},
      },
      info: {
        apiName: 'topic',
        type: 'content-api',
      },
    },
  ],
};
