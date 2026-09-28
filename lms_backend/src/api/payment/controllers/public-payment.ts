import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

const PAYMENT_METHODS = ['bkash', 'nagad', 'rocket'] as const;
const SUBSCRIPTION_PRICE = 99;
// Bangladeshi mobile numbers: 11 digits, start with 013–019
const PHONE_REGEX = /^01[3-9]\d{8}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

type CleanInput = {
  username: string;
  email: string;
  password: string;
  paymentMethod: string;
  senderNumber: string;
  transactionId: string;
};

function validateInput(body: any): { valid: boolean; errors: string[]; clean: CleanInput } {
  const errors: string[] = [];

  const clean: CleanInput = {
    username: String(body?.username ?? '').trim(),
    email: String(body?.email ?? '').trim().toLowerCase(),
    password: String(body?.password ?? ''),
    paymentMethod: String(body?.paymentMethod ?? '').trim(),
    senderNumber: String(body?.senderNumber ?? '').trim(),
    transactionId: String(body?.transactionId ?? '').trim().toUpperCase(),
  };

  if (clean.username.length < 3) {
    errors.push('Username must be at least 3 characters.');
  }
  if (!EMAIL_REGEX.test(clean.email)) {
    errors.push('A valid email is required.');
  }
  if (clean.password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }
  if (!PAYMENT_METHODS.includes(clean.paymentMethod as any)) {
    errors.push('Payment method must be one of: bkash, nagad, rocket.');
  }
  if (!PHONE_REGEX.test(clean.senderNumber)) {
    errors.push('Sender number must be a valid 11-digit Bangladeshi mobile number (e.g. 01712345678).');
  }
  if (clean.transactionId.length < 5) {
    errors.push('Transaction ID is required (at least 5 characters).');
  }

  return { valid: errors.length === 0, errors, clean };
}

export default {
  /**
   * POST /api/payments/register-with-payment
   *
   * Public endpoint (auth: false). Creates a User with approvalStatus='pending'
   * and a linked Payment with approval_status='pending' in one flow.
   *
   * Does NOT return a JWT — the user cannot log in until an admin approves
   * the payment (which sets approvalStatus='approved' and accessExpiresAt).
   */
  async registerWithPayment(ctx: any) {
    const parsed = validateInput(ctx.request.body);

    if (!parsed.valid) {
      ctx.status = 400;
      ctx.body = { error: parsed.errors[0], details: parsed.errors };
      return;
    }

    const { username, email, password, paymentMethod, senderNumber, transactionId } = parsed.clean;

    // Pre-checks (fast rejection before we touch anything)
    const existingUsername = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (existingUsername) {
      ctx.status = 400;
      ctx.body = { error: 'Username is already taken.' };
      return;
    }

    const existingEmail = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { email } });

    if (existingEmail) {
      ctx.status = 400;
      ctx.body = { error: 'An account with this email already exists.' };
      return;
    }

    const existingTxn = await strapi.db
      .query('api::payment.payment')
      .findOne({ where: { transactionId } });

    if (existingTxn) {
      ctx.status = 400;
      ctx.body = {
        error:
          'This transaction ID has already been used. If you believe this is a mistake, contact support.',
      };
      return;
    }

    // Get the Authenticated role id
    const authRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });

    if (!authRole) {
      throw new ApplicationError('Authenticated role is not configured.');
    }

    // Create the User
    let user: any;
    try {
      user = await strapi.plugin('users-permissions').service('user').add({
        username,
        email,
        password,
        provider: 'local',
        confirmed: true,
        blocked: false,
        role: authRole.id,
        approvalStatus: 'pending',
      });
    } catch (err: any) {
      strapi.log.error('[register-with-payment] user creation failed:', err);
      ctx.status = 400;
      ctx.body = { error: err?.message || 'Failed to create account.' };
      return;
    }

    // Create the Payment. If this fails, roll back the User.
    try {
      await strapi.db.query('api::payment.payment').create({
        data: {
          user: user.id,
          transactionId,
          paymentMethod,
          senderNumber,
          amount: SUBSCRIPTION_PRICE,
          approval_status: 'pending',
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      strapi.log.error('[register-with-payment] payment creation failed:', err);

      // Best-effort rollback of the user so we don't leave orphans
      try {
        await strapi.plugin('users-permissions').service('user').remove({ id: user.id });
      } catch (rollbackErr) {
        strapi.log.error('[register-with-payment] rollback failed:', rollbackErr);
      }

      // Friendly message for duplicate transactionId (DB unique constraint)
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
      ctx.body = {
        error: 'Failed to record payment. Please try again or contact support.',
      };
      return;
    }

    ctx.body = {
      data: {
        message:
          'Account created. Your payment is pending verification. You will be able to log in once an admin approves it.',
        user: {
          username,
          email,
          approvalStatus: 'pending',
        },
      },
    };
  },
};
