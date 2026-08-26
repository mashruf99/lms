import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

function extractRelationId(value: any): string | number | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value.set && Array.isArray(value.set) && value.set[0]) {
    return value.set[0].id ?? value.set[0].documentId ?? null;
  }
  if (value.connect && Array.isArray(value.connect) && value.connect[0]) {
    return value.connect[0].id ?? value.connect[0].documentId ?? null;
  }
  if (value.id) return value.id;
  return null;
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    const ctx = strapi.requestContext.get();
    const user = ctx?.state?.user;

    if (!user) {
      return;
    }

    data.student = user.id;

    const courseId = extractRelationId(data.course);

    if (!courseId) {
      return;
    }

    const studentEnrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: { student: user.id },
      populate: { course: true },
    });

    const alreadyEnrolled = studentEnrollments.some(
      (enrollment: any) => String(enrollment.course?.id) === String(courseId)
    );

    if (alreadyEnrolled) {
      throw new ApplicationError('Already enrolled in this course');
    }
  },
};
