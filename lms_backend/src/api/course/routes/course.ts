/**
 * course router
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::course.course', {
  config: {
    update: {
      policies: ['api::course.is-owner-or-privileged'],
    },
    delete: {
      policies: ['api::course.is-owner-or-privileged'],
    },
  },
});
