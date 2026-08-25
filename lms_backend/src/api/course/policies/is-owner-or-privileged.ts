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

  // Admin and Content Manager can act on any course
  if (userRole === 'Admin' || userRole === 'Content Manager') {
    return true;
  }

  // Instructor must own the course they're modifying
  if (userRole === 'Instructor') {
    const courseId = policyContext.params.id;

    if (!courseId) {
      // No specific course targeted (e.g. a "create" request) — allow, ownership gets set on create
      return true;
    }

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseId,
      populate: ['owner'],
    });

    if (!course || !course.owner) {
      return false;
    }

    return course.owner.id === user.id;
  }

  return false;
};
