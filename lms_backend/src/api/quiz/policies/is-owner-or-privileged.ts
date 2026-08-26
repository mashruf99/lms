import type { Core } from '@strapi/strapi';

export default async (
  policyContext: any,
  config: any,
  { strapi }: { strapi: Core.Strapi }
) => {
  const user = policyContext.state.user;

  if (!user) {
    return false;
  }

  const userRole = user.role?.name;

  if (userRole === 'Admin' || userRole === 'Content Manager') {
    return true;
  }

  if (userRole === 'Instructor') {
    const quizId = policyContext.params.id;

    if (!quizId) {
      const courseId = policyContext.request.body?.data?.course;

      if (!courseId) {
        return false;
      }

      const course = await strapi.documents('api::course.course').findOne({
        documentId: courseId,
        populate: ['owner'],
      });

      return course?.owner?.id === user.id;
    }

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: quizId,
      populate: { course: { populate: ['owner'] } },
    });

    if (!quiz || !quiz.course || !quiz.course.owner) {
      return false;
    }

    return quiz.course.owner.id === user.id;
  }

  return false;
};
