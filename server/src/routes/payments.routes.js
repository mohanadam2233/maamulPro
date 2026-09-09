import { Router } from 'express';
import { z } from 'zod';
import Counter from '../models/Counter.js';
import Customer from '../models/Customer.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Vendor from '../models/Vendor.js';
import { allowRoles } from '../middleware/auth.js';
import { writeAudit } from '../services/audit.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runAtomic, sessionOptions, useSession } from '../utils/transaction.js';
import { validateSettlement } from '../services/purchase.js';

const router = Router();
const receiptRoles = allowRoles('BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER');
const supplierPaymentRoles = allowRoles('BUSINESS_ADMIN', 'ACCOUNTANT');
const paymentSchema = z.object({
  partyId: z.string().min(1),
  amountMinor: z.number().int().positive(),
  discountMinor: z.number().int().min(0).default(0),
  reference: z.string().trim().min(2).max(100),
  account: z.string().trim().min(2).max(80),
  paymentDate: z.coerce.date(),
});

router.get('/', allowRoles('BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR'), asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const query = { tenantId: req.tenantId };
  if (['CUSTOMER_RECEIPT', 'SUPPLIER_PAYMENT'].includes(req.query.type)) query.type = req.query.type;
  if (req.query.from || req.query.to) {
    query.paymentDate = {};
    if (req.query.from) query.paymentDate.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
    if (req.query.to) query.paymentDate.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  if (req.query.search) {
    const expression = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [customerIds, vendorIds] = await Promise.all([
      Customer.find({ tenantId: req.tenantId, name: expression }).distinct('_id'),
      Vendor.find({ tenantId: req.tenantId, name: expression }).distinct('_id'),
    ]);
    query.$or = [
      { paymentNumber: expression }, { reference: expression }, { account: expression },
      { customerId: { $in: customerIds } }, { vendorId: { $in: vendorIds } },
    ];
  }
  const [payments, total] = await Promise.all([
    PaymentTransaction.find(query)
      .populate('customerId', 'name')
      .populate('vendorId', 'name')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PaymentTransaction.countDocuments(query),
  ]);
  res.json({ success: true, data: payments, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

async function recordPayment(req, input, type) {
  const isCustomer = type === 'CUSTOMER_RECEIPT';
  const Model = isCustomer ? Customer : Vendor;
  const label = isCustomer ? 'Customer' : 'Supplier';

  return runAtomic(async (session) => {
    const party = await useSession(Model.findOne({
      _id: input.partyId,
      tenantId: req.tenantId,
      isActive: { $ne: false },
    }), session);
    if (!party) throw new AppError(404, `${label} not found`, 'PARTY_NOT_FOUND');

    const { settlementMinor } = validateSettlement(party.balanceMinor, input.amountMinor, input.discountMinor, label);

    const updated = await Model.updateOne(
      { _id: party._id, tenantId: req.tenantId, balanceMinor: { $gte: settlementMinor } },
      { $inc: { balanceMinor: -settlementMinor } },
      sessionOptions(session),
    );
    if (updated.modifiedCount !== 1) throw new AppError(409, `${label} balance changed. Please retry.`, 'BALANCE_CHANGED');

    const counter = await Counter.findOneAndUpdate(
      { tenantId: req.tenantId, name: 'business-payment' },
      { $inc: { value: 1 } },
      sessionOptions(session, { upsert: true, new: true }),
    );
    const [payment] = await PaymentTransaction.create([{
      tenantId: req.tenantId,
      paymentNumber: `${isCustomer ? 'REC' : 'PAY'}-${String(counter.value).padStart(6, '0')}`,
      type,
      customerId: isCustomer ? party._id : null,
      vendorId: isCustomer ? null : party._id,
      amountMinor: input.amountMinor,
      discountMinor: input.discountMinor,
      reference: input.reference,
      account: input.account,
      paymentDate: input.paymentDate,
      createdBy: req.user._id,
    }], sessionOptions(session));
    return payment;
  });
}

router.post('/customer', receiptRoles, asyncHandler(async (req, res) => {
  const payment = await recordPayment(req, paymentSchema.parse(req.body), 'CUSTOMER_RECEIPT');
  await writeAudit(req, { action: 'CUSTOMER_PAYMENT_RECEIVED', entityType: 'PaymentTransaction', entityId: payment._id, after: payment.toObject() });
  res.status(201).json({ success: true, data: payment });
}));

router.post('/supplier', supplierPaymentRoles, asyncHandler(async (req, res) => {
  const payment = await recordPayment(req, paymentSchema.parse(req.body), 'SUPPLIER_PAYMENT');
  await writeAudit(req, { action: 'SUPPLIER_PAYMENT_MADE', entityType: 'PaymentTransaction', entityId: payment._id, after: payment.toObject() });
  res.status(201).json({ success: true, data: payment });
}));

export default router;
