import { errors } from '@strapi/utils';

const { ForbiddenError } = errors;

export default {
  async forCourse(ctx: any) {
    const user = ctx.state.user;
    const { courseId } = ctx.params;

    if (!user) {
      ctx.status = 401;
      ctx.body = { error: 'Not authenticated' };
      return;
    }

    const roleName = user.role?.name;

    const course = await strapi.db.query('api::course.course').findOne({
      where: { documentId: courseId },
      populate: { owner: true },
    });

    if (!course) {
      ctx.status = 404;
      ctx.body = { error: 'Course not found' };
      return;
    }

    const isPrivileged = roleName === 'Admin' || roleName === 'Content Manager';
    const isOwner = roleName === 'Instructor' && course.owner?.id === user.id;

    if (!isPrivileged && !isOwner) {
      throw new ForbiddenError('You do not have access to this course\'s progress');
    }

    const lessons = await strapi.db.query('api::lesson.lesson').findMany({
      where: { course: course.id },
    });
    const totalLessons = lessons.length;
    const lessonIds = lessons.map((l: any) => l.id);

    const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: { course: course.id },
      populate: { student: true },
    });

    const allProgress = await strapi.db.query('api::lesson-progress.lesson-progress').findMany({
      where: { lesson: { $in: lessonIds } },
      populate: { student: true, lesson: true },
    });

    const students = enrollments.map((enrollment: any) => {
      const studentId = enrollment.student?.id;
      const completedCount = allProgress.filter(
        (p: any) => p.student?.id === studentId && p.completed && lessonIds.includes(p.lesson?.id)
      ).length;

      const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return {
        studentId,
        username: enrollment.student?.username,
        email: enrollment.student?.email,
        completedCount,
        totalLessons,
        percent,
      };
    });

    ctx.body = { data: { courseTitle: course.title, totalLessons, students } };
  },
};
