import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;

    if (!data.transactionId) return;

    const existing = await strapi.db.query('api::payment.payment').findOne({
      where: { transactionId: data.transactionId },
    });

    if (existing) {
      throw new ApplicationError(
        'This transaction ID has already been used. If you believe this is a mistake, contact support.'
      );
    }
  },
};
