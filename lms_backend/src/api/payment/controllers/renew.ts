import { errors } from '@strapi/utils';

const { NotFoundError } = errors;

const PAYMENT_METHODS = ['bkash', 'nagad', 'rocket'] as const;
const SUBSCRIPTION_PRICE = 99;
const PHONE_REGEX = /^01[3-9]\d{8}$/;

type CleanRenewal = {
  paymentMethod: string;
  senderNumber: string;
  transactionId: string;
};

function validateRenewal(body: any): { valid: boolean; errors: string[]; clean: CleanRenewal } {
  const errors: string[] = [];

  const clean: CleanRenewal = {
    paymentMethod: String(body?.paymentMethod ?? '').trim(),
    senderNumber: String(body?.senderNumber ?? '').trim(),
    transactionId: String(body?.transactionId ?? '').trim().toUpperCase(),
  };

  if (!PAYMENT_METHODS.includes(clean.paymentMethod as any)) {
    errors.push('Payment method must be one of: bkash, nagad, rocket.');
  }
  if (!PHONE_REGEX.test(clean.senderNumber)) {
    errors.push('Sender number must be a valid 11-digit Bangladeshi mobile number.');
  }
  if (clean.transactionId.length < 5) {
    errors.push('Transaction ID is required (at least 5 characters).');
  }

  return { valid: errors.length === 0, errors, clean };
}

export default {
  /**
   * POST /api/payments/renew
   *
   * Authenticated (auth: {}). Requires a logged-in user.
   * Creates a new Payment with approval_status='pending' linked to
   * ctx.state.user. Does NOT touch User.accessExpiresAt — that happens
   * only when an admin approves the payment.
   *
   * Works for both active users (early renewal) and expired users
   * (they can log in but can't practice; this is how they get back in).
   */
  async renew(ctx: any) {
    const user = ctx.state.user;

    if (!user) {
      ctx.status = 401;
      ctx.body = { error: 'Not authenticated.' };
      return;
    }

    const parsed = validateRenewal(ctx.request.body);

    if (!parsed.valid) {
      ctx.status = 400;
      ctx.body = { error: parsed.errors[0], details: parsed.errors };
      return;
    }

    const { paymentMethod, senderNumber, transactionId } = parsed.clean;

    // Fast rejection on duplicate transactionId
    const existing = await strapi.db
      .query('api::payment.payment')
      .findOne({ where: { transactionId } });

    if (existing) {
      ctx.status = 400;
      ctx.body = {
        error:
          'This transaction ID has already been used. If you believe this is a mistake, contact support.',
      };
      return;
    }

    // Verify the user exists in the DB (edge case: deleted between JWT and here)
    const dbUser = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: user.id } });

    if (!dbUser) {
      throw new NotFoundError('User not found.');
    }

    // Create the pending payment
    try {
      const payment = await strapi.db.query('api::payment.payment').create({
        data: {
          user: dbUser.id,
          transactionId,
          paymentMethod,
          senderNumber,
          amount: SUBSCRIPTION_PRICE,
          approval_status: 'pending',
          submittedAt: new Date().toISOString(),
        },
      });

      ctx.body = {
        data: {
          message:
            'Renewal submitted. Your payment is pending verification — you will be notified once an admin approves it.',
          paymentDocumentId: payment.documentId,
        },
      };
    } catch (err: any) {
      strapi.log.error('[renew] payment creation failed:', err);

      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('unique') || msg.includes('already')) {
        ctx.status = 400;
        ctx.body = {
          error:
            'This transaction ID has already been used. If you believe this is a mistake, contact support.',
        };
        return;
      }

      ctx.status = 500;
      ctx.body = { error: 'Failed to submit renewal. Please try again.' };
    }
  },
};
