import Tenant from '../models/Tenant.js';
import Subscription from '../models/Subscription.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireActiveSubscription = asyncHandler(async (req, _res, next) => {
  if (req.user.role === 'SUPER_ADMIN') return next();
  const [tenant, subscription] = await Promise.all([
    Tenant.findById(req.tenantId),
    Subscription.findOne({ tenantId: req.tenantId }),
  ]);
  const now = new Date();
  if (tenant && subscription?.expiresAt && subscription.expiresAt <= now && ['ACTIVE', 'TRIALING'].includes(subscription.status)) {
    const withinGrace = subscription.graceEndsAt && subscription.graceEndsAt > now;
    subscription.status = withinGrace ? 'PAST_DUE' : 'SUSPENDED';
    tenant.status = withinGrace ? 'PAST_DUE' : 'SUSPENDED';
    await Promise.all([subscription.save(), tenant.save()]);
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!tenant || tenant.status !== 'ACTIVE' || !subscription || !['ACTIVE', 'TRIALING'].includes(subscription.status)) {
    throw new AppError(402, 'Subscription inactive. Submit payment or contact support.', 'SUBSCRIPTION_INACTIVE');
  }
  next();
});
