/**
 * lesson router
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::lesson.lesson', {
  config: {
    create: {
      policies: ['api::lesson.is-owner-or-privileged'],
    },
    update: {
      policies: ['api::lesson.is-owner-or-privileged'],
    },
    delete: {
      policies: ['api::lesson.is-owner-or-privileged'],
    },
  },
});
