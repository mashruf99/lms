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

  // Admin and Content Manager can act on any lesson
  if (userRole === 'Admin' || userRole === 'Content Manager') {
    return true;
  }

  if (userRole === 'Instructor') {
    const lessonId = policyContext.params.id;

    if (!lessonId) {
      // Create request with no lesson id yet — check ownership via the course being targeted
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

    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonId,
      populate: { course: { populate: ['owner'] } },
    });

    if (!lesson || !lesson.course || !lesson.course.owner) {
      return false;
    }

    return lesson.course.owner.id === user.id;
  }

  return false;
};
