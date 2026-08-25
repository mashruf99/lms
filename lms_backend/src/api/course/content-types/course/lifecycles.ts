//lifecycles.ts
import { Event } from '@strapi/database/dist/lifecycles';

export default {
  async beforeCreate(event: Event) {
    const ctx = strapi.requestContext.get();
    const user = ctx?.state?.user;

    if (user && event.params.data) {
      event.params.data.owner = user.id;
    }
  },
};