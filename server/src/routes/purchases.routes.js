import { Router } from 'express';
import { z } from 'zod';
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import Vendor from '../models/Vendor.js';
import Counter from '../models/Counter.js';
import { allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../services/audit.js';
import { runAtomic, sessionOptions, useSession } from '../utils/transaction.js';
import { calculatePurchaseTotals } from '../services/purchase.js';

const router = Router();
const inputSchema = z.object({
  vendorId: z.string(), paidMinor: z.number().int().min(0),
  discountMinor: z.number().int().min(0).default(0),
  purchaseDate: z.coerce.date().optional(),
  referenceNumber: z.string().trim().max(80).default(''),
  paymentMethod: z.string().trim().min(2).max(40).default('Cash'),
  note: z.string().trim().max(1000).default(''),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive(), unitCostMinor: z.number().int().min(0) })).min(1),
});

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const query = { tenantId: req.tenantId };
  if (req.query.from || req.query.to) {
    query.purchaseDate = {};
    if (req.query.from) query.purchaseDate.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
    if (req.query.to) query.purchaseDate.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  if (req.query.search) {
    const expression = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const vendorIds = await Vendor.find({ tenantId: req.tenantId, name: expression }).distinct('_id');
    query.$or = [{ purchaseNumber: expression }, { referenceNumber: expression }, { vendorId: { $in: vendorIds } }];
  }
  const [purchases, total] = await Promise.all([
    Purchase.find(query).populate('vendorId', 'name').sort({ purchaseDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Purchase.countDocuments(query),
  ]);
  res.json({ success: true, data: purchases, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.post('/', allowRoles('BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STOREKEEPER'), asyncHandler(async (req, res) => {
  const input = inputSchema.parse(req.body);
  const purchase = await runAtomic(async (session) => {
      const productIds = input.items.map((item) => item.productId);
      if (new Set(productIds).size !== productIds.length) throw new AppError(422, 'Each product can appear only once per purchase', 'DUPLICATE_PRODUCT');
      const [vendor, products] = await Promise.all([
        useSession(Vendor.findOne({ _id: input.vendorId, tenantId: req.tenantId, isActive: true }), session),
        useSession(Product.find({ _id: { $in: productIds }, tenantId: req.tenantId, isActive: true }), session),
      ]);
      if (!vendor) throw new AppError(422, 'Vendor not found', 'VENDOR_NOT_FOUND');
      if (products.length !== input.items.length) throw new AppError(422, 'One or more products are unavailable', 'PRODUCT_UNAVAILABLE');
      const map = new Map(products.map((product) => [product.id, product]));
      const lines = input.items.map((item) => ({ ...item, productId: map.get(item.productId)._id, name: map.get(item.productId).name, lineTotalMinor: item.quantity * item.unitCostMinor }));
      const { subtotalMinor, totalMinor, balanceMinor } = calculatePurchaseTotals(lines, input.discountMinor, input.paidMinor);
      const counter = await Counter.findOneAndUpdate({ tenantId: req.tenantId, name: 'purchase' }, { $inc: { value: 1 } }, sessionOptions(session, { upsert: true, new: true }));
      const [created] = await Purchase.create([{
        tenantId: req.tenantId,
        purchaseNumber: `PUR-${String(counter.value).padStart(6, '0')}`,
        vendorId: vendor._id,
        items: lines,
        subtotalMinor,
        discountMinor: input.discountMinor,
        totalMinor,
        paidMinor: input.paidMinor,
        status: input.paidMinor === totalMinor ? 'PAID' : input.paidMinor > 0 ? 'PARTIAL' : 'UNPAID',
        purchaseDate: input.purchaseDate || new Date(),
        referenceNumber: input.referenceNumber,
        paymentMethod: input.paymentMethod,
        note: input.note,
        createdBy: req.user._id,
      }], sessionOptions(session));
      for (const line of lines) {
        const product = map.get(line.productId.toString());
        const newStock = product.stock + line.quantity;
        const weightedCost = newStock ? Math.round(((product.stock * product.costMinor) + line.lineTotalMinor) / newStock) : line.unitCostMinor;
        await Product.updateOne({ _id: product._id, tenantId: req.tenantId }, { $inc: { stock: line.quantity }, $set: { costMinor: weightedCost } }, sessionOptions(session));
      }
      if (balanceMinor > 0) {
        await Vendor.updateOne({ _id: vendor._id, tenantId: req.tenantId }, { $inc: { balanceMinor } }, sessionOptions(session));
      }
      return created;
  });
  await writeAudit(req, { action: 'PURCHASE_RECEIVED', entityType: 'Purchase', entityId: purchase._id, after: purchase.toObject() });
  res.status(201).json({ success: true, data: purchase });
}));
export default router;
