import { Router } from 'express';
import { z } from 'zod';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import PaymentSubmission from '../models/PaymentSubmission.js';
import { allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../services/audit.js';

const router = Router();
router.use(allowRoles('SUPER_ADMIN'));

router.get('/overview', asyncHandler(async (_req, res) => {
  const [tenants, active, pendingPayments, suspended, recentPayments] = await Promise.all([
    Tenant.countDocuments(), Tenant.countDocuments({ status: 'ACTIVE' }), PaymentSubmission.countDocuments({ status: 'PENDING_REVIEW' }),
    Tenant.countDocuments({ status: 'SUSPENDED' }), PaymentSubmission.find().populate('tenantId', 'name').sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  res.json({ success: true, data: { metrics: { tenants, active, pendingPayments, suspended }, recentPayments } });
}));

router.get('/tenants', asyncHandler(async (_req, res) => {
  const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
  const subscriptions = await Subscription.find({ tenantId: { $in: tenants.map((tenant) => tenant._id) } }).lean();
  const map = new Map(subscriptions.map((sub) => [sub.tenantId.toString(), sub]));
  res.json({ success: true, data: tenants.map((tenant) => ({ ...tenant, subscription: map.get(tenant._id.toString()) || null })) });
}));

router.post('/tenants', asyncHandler(async (req, res) => {
  const input = z.object({ businessName: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/), email: z.string().email(), phone: z.string().optional(), adminName: z.string().min(2), username: z.string().min(3), password: z.string().min(8) }).parse(req.body);
  const tenant = await Tenant.create({ name: input.businessName, slug: input.slug, email: input.email, phone: input.phone });
  try {
    const admin = await User.create({ tenantId: tenant._id, name: input.adminName, username: input.username, email: input.email, password: input.password, role: 'BUSINESS_ADMIN' });
    await Subscription.create({ tenantId: tenant._id, status: 'PENDING_PAYMENT' });
    await writeAudit(req, { action: 'TENANT_CREATED', entityType: 'Tenant', entityId: tenant._id, after: tenant.toObject() });
    res.status(201).json({ success: true, data: { tenant, admin: { id: admin.id, email: admin.email } } });
  } catch (error) {
    await Tenant.findByIdAndDelete(tenant._id);
    throw error;
  }
}));

router.get('/payments', asyncHandler(async (_req, res) => {
  const payments = await PaymentSubmission.find().populate('tenantId', 'name email status').populate('reviewedBy', 'name').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: payments });
}));

router.post('/payments/:id/decision', asyncHandler(async (req, res) => {
  const input = z.object({ decision: z.enum(['APPROVED', 'REJECTED', 'CORRECTION_REQUIRED']), reason: z.string().min(3) }).parse(req.body);
  const payment = await PaymentSubmission.findById(req.params.id);
  if (!payment || payment.status !== 'PENDING_REVIEW') throw new AppError(409, 'Payment is unavailable or already reviewed', 'PAYMENT_NOT_REVIEWABLE');
  payment.status = input.decision; payment.decisionReason = input.reason; payment.reviewedBy = req.user._id; payment.reviewedAt = new Date();
  await payment.save();
  if (input.decision === 'APPROVED') {
    const current = await Subscription.findOne({ tenantId: payment.tenantId });
    const start = current?.expiresAt > new Date() ? current.expiresAt : new Date();
    const end = new Date(start); end.setMonth(end.getMonth() + payment.billingMonths);
    const grace = new Date(end); grace.setDate(grace.getDate() + 7);
    await Subscription.findOneAndUpdate({ tenantId: payment.tenantId }, { status: 'ACTIVE', amountMinor: payment.amountMinor, currency: payment.currency, startsAt: start, expiresAt: end, graceEndsAt: grace }, { upsert: true });
    await Tenant.findByIdAndUpdate(payment.tenantId, { status: 'ACTIVE' });
  }
  await writeAudit(req, { action: `PAYMENT_${input.decision}`, entityType: 'PaymentSubmission', entityId: payment._id, after: payment.toObject(), reason: input.reason });
  res.json({ success: true, data: payment });
}));

router.post('/tenants/:id/status', asyncHandler(async (req, res) => {
  const { status, reason } = z.object({ status: z.enum(['ACTIVE', 'PAST_DUE', 'SUSPENDED', 'ARCHIVED']), reason: z.string().min(3) }).parse(req.body);
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new AppError(404, 'Tenant not found', 'NOT_FOUND');
  const before = tenant.toObject(); tenant.status = status; await tenant.save();
  if (['PAST_DUE', 'SUSPENDED'].includes(status)) await Subscription.findOneAndUpdate({ tenantId: tenant._id }, { status });
  await writeAudit(req, { action: `TENANT_${status}`, entityType: 'Tenant', entityId: tenant._id, before, after: tenant.toObject(), reason });
  res.json({ success: true, data: tenant });
}));

router.patch('/tenants/:id/subscription', asyncHandler(async (req, res) => {
  const input = z.object({
    action: z.enum(['ACTIVATE', 'EXTEND', 'SUSPEND', 'CANCEL']),
    months: z.number().int().min(1).max(60).default(1),
    amountMinor: z.number().int().min(0).default(0),
    currency: z.string().length(3).default('USD'),
    reason: z.string().trim().min(3).max(250),
  }).parse(req.body);
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new AppError(404, 'Tenant not found', 'NOT_FOUND');
  const current = await Subscription.findOne({ tenantId: tenant._id });
  const before = current?.toObject() || null;
  const now = new Date();
  const update = { amountMinor: input.amountMinor, currency: input.currency.toUpperCase() };

  if (input.action === 'ACTIVATE' || input.action === 'EXTEND') {
    const start = input.action === 'EXTEND' && current?.expiresAt > now ? new Date(current.expiresAt) : now;
    const end = new Date(start);
    end.setMonth(end.getMonth() + input.months);
    const grace = new Date(end);
    grace.setDate(grace.getDate() + 7);
    Object.assign(update, { status: 'ACTIVE', startsAt: now, expiresAt: end, graceEndsAt: grace });
    tenant.status = 'ACTIVE';
  } else if (input.action === 'SUSPEND') {
    update.status = 'SUSPENDED';
    tenant.status = 'SUSPENDED';
  } else {
    update.status = 'CANCELLED';
    tenant.status = 'PAST_DUE';
  }

  const subscription = await Subscription.findOneAndUpdate(
    { tenantId: tenant._id },
    { $set: update, $setOnInsert: { plan: 'STANDARD' } },
    { upsert: true, new: true, runValidators: true },
  );
  await tenant.save();
  await writeAudit(req, {
    action: `SUBSCRIPTION_${input.action}`,
    entityType: 'Subscription',
    entityId: subscription._id,
    before,
    after: subscription.toObject(),
    reason: input.reason,
  });
  res.json({ success: true, data: { tenant, subscription } });
}));

export default router;
