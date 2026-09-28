import {
  countTopicQuestions,
  getSampleMcqs,
  getSampleCqs,
} from '../../practice/services/topics-helpers';

const SAMPLE_LIMIT = 3;

export default {
  /**
   * GET /api/public/topics
   *
   * No authentication required. Returns topic names, question counts, and
   * up to 3 sample MCQ + 3 sample CQ questions per topic. Never includes
   * answer keys, model answers, or per-user data.
   *
   * Intended for the pre-signup preview page.
   */
  async topics(ctx: any) {
    const topics = await strapi.db.query('api::topic.topic').findMany({
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(
      topics.map(async (topic: any) => {
        const { totalMcq, totalCq } = await countTopicQuestions(strapi, topic.id);

        const sampleMcq =
          totalMcq > 0 ? await getSampleMcqs(strapi, topic.id, SAMPLE_LIMIT) : [];
        const sampleCq =
          totalCq > 0 ? await getSampleCqs(strapi, topic.id, SAMPLE_LIMIT) : [];

        return {
          topicId: topic.documentId,
          name: topic.name,
          totalMcq,
          totalCq,
          sampleMcq,
          sampleCq,
        };
      })
    );

    ctx.body = { data: result };
  },
};
