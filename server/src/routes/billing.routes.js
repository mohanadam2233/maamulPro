import { Router } from 'express';
import { z } from 'zod';
import PaymentSubmission from '../models/PaymentSubmission.js';
import Subscription from '../models/Subscription.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAudit } from '../services/audit.js';
import { allowRoles } from '../middleware/auth.js';

const router = Router();
const schema = z.object({ amountMinor: z.number().int().min(1), currency: z.string().length(3).default('USD'), billingMonths: z.number().int().min(1).max(24).default(1), method: z.string().min(2), reference: z.string().min(3), evidenceUrl: z.string().url().optional().or(z.literal('')), notes: z.string().optional() });

router.get('/', asyncHandler(async (req, res) => {
  const [subscription, payments] = await Promise.all([
    Subscription.findOne({ tenantId: req.tenantId }).lean(),
    PaymentSubmission.find({ tenantId: req.tenantId }).sort({ createdAt: -1 }).lean(),
  ]);
  res.json({ success: true, data: { subscription, payments } });
}));

router.post('/payments', allowRoles('BUSINESS_ADMIN', 'ACCOUNTANT'), asyncHandler(async (req, res) => {
  const payment = await PaymentSubmission.create({ ...schema.parse(req.body), tenantId: req.tenantId });
  await writeAudit(req, { action: 'PAYMENT_SUBMITTED', entityType: 'PaymentSubmission', entityId: payment._id, after: payment.toObject() });
  res.status(201).json({ success: true, data: payment });
}));

export default router;
