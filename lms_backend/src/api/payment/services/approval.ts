import { errors } from '@strapi/utils';

const { ApplicationError, NotFoundError, ValidationError } = errors;

const SUBSCRIPTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SAFE_USER_FIELDS = [
  'id',
  'documentId',
  'username',
  'email',
  'approvalStatus',
  'accessExpiresAt',
];

export default {
  /**
   * Approve a pending payment.
   *
   * Side effects:
   *  - User:    accessExpiresAt = periodEnd, approvalStatus = approved
   *  - Payment: approval_status=approved, periodStart=now, periodEnd=now+30d,
   *             verifiedBy=adminId, submittedAt set if missing
   *
   * Ordering: we update the User FIRST so that if anything crashes mid-way,
   * the user (who paid) has extended access. The payment stays pending, and
   * the admin can re-approve — the idempotency guard prevents double-extension.
   *
   * Idempotency: throws if the payment is not currently 'pending'.
   */
  async approvePayment(
    strapi: any,
    paymentDocumentId: string,
    adminId: number | null
  ) {
    if (!paymentDocumentId) {
      throw new ValidationError('Payment documentId is required');
    }

    const payment = await strapi.db.query('api::payment.payment').findOne({
      where: { documentId: paymentDocumentId },
      populate: {
        user: { select: ['id', 'documentId', 'accessExpiresAt'] },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.approval_status !== 'pending') {
      throw new ValidationError(
        `Payment is already ${payment.approval_status}. Only pending payments can be approved.`
      );
    }

    if (!payment.user) {
      throw new ApplicationError('Payment has no associated user');
    }

    const now = new Date();
    // Extend from whichever is later: now, or the user's existing expiry.
    // This means early renewals don't sacrifice remaining days.
  
    const currentExpiry = payment.user?.accessExpiresAt
      ? new Date(payment.user.accessExpiresAt)
      : null;
    const startFrom = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const periodEnd = new Date(startFrom.getTime() + SUBSCRIPTION_DAYS * MS_PER_DAY);
    const periodStartIso = now.toISOString();
    const periodEndIso = periodEnd.toISOString();



    // 1. Update the user FIRST
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: payment.user.id },
      data: {
        accessExpiresAt: periodEndIso,
        approvalStatus: 'approved',
      },
    });

    // 2. Then update the payment
    await strapi.db.query('api::payment.payment').update({
      where: { id: payment.id },
      data: {
        approval_status: 'approved',
        periodStart: periodStartIso,
        periodEnd: periodEndIso,
        submittedAt: payment.submittedAt ?? periodStartIso,
        verifiedBy: adminId ?? undefined,
      },
    });

    // 3. Re-fetch with safe user fields for the response.
    //    This ensures the response shows post-update state, not a stale
    //    snapshot from before the user update, and never leaks the password.
    const fresh = await strapi.db.query('api::payment.payment').findOne({
      where: { id: payment.id },
      populate: {
        user: { select: SAFE_USER_FIELDS },
      },
    });

    return fresh;
  },

  /**
   * Reject a pending payment.
   *
   * Side effects:
   *  - Payment: approval_status=rejected, rejectionReason=<reason>, verifiedBy=adminId
   *  - User:    UNCHANGED (user stays 'pending' so they can resubmit a corrected TrxID)
   *
   * Idempotency: throws if the payment is not currently 'pending'.
   */
  async rejectPayment(
    strapi: any,
    paymentDocumentId: string,
    adminId: number | null,
    reason: string
  ) {
    if (!paymentDocumentId) {
      throw new ValidationError('Payment documentId is required');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new ValidationError('A rejection reason is required');
    }

    const payment = await strapi.db.query('api::payment.payment').findOne({
      where: { documentId: paymentDocumentId },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.approval_status !== 'pending') {
      throw new ValidationError(
        `Payment is already ${payment.approval_status}. Only pending payments can be rejected.`
      );
    }

    const updated = await strapi.db.query('api::payment.payment').update({
      where: { id: payment.id },
      data: {
        approval_status: 'rejected',
        rejectionReason: reason.trim(),
        verifiedBy: adminId ?? undefined,
      },
      populate: {
        user: { select: SAFE_USER_FIELDS },
      },
    });

    return updated;
  },

  /**
   * Fast check — is this user's subscription currently active?
   *
   * Uses the denormalized User.accessExpiresAt field for a single indexed read.
   *
   * Returns false if:
   *  - user not found
   *  - accessExpiresAt is null/empty (never approved)
   *  - accessExpiresAt is in the past (expired)
   */
  async hasActiveSubscription(strapi: any, userId: number): Promise<boolean> {
    if (!userId) return false;

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      select: ['id', 'accessExpiresAt'],
    });

    if (!user || !user.accessExpiresAt) {
      return false;
    }

    return new Date(user.accessExpiresAt).getTime() > Date.now();
  },
};
