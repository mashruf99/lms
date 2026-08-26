/**
 * quiz router
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::quiz.quiz', {
  config: {
    create: {
      policies: ['api::quiz.is-owner-or-privileged'],
    },
    update: {
      policies: ['api::quiz.is-owner-or-privileged'],
    },
    delete: {
      policies: ['api::quiz.is-owner-or-privileged'],
    },
  },
});
