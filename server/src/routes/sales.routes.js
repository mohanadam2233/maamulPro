import { Router } from 'express';
import { z } from 'zod';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Counter from '../models/Counter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../services/audit.js';
import { allowRoles } from '../middleware/auth.js';
import { runAtomic, sessionOptions, useSession } from '../utils/transaction.js';
import { calculateInvoiceTotals, validateCredit } from '../services/invoice.js';

const router = Router();
const saleSchema = z.object({
  customerId: z.string().nullable().optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
  discountMinor: z.number().int().min(0).default(0),
  paidMinor: z.number().int().min(0),
  paymentMethod: z.string().trim().min(2).max(40).default('Cash'),
  referenceNumber: z.string().trim().max(80).default(''),
  invoiceDate: z.coerce.date().optional(),
  taxRateBps: z.number().int().min(0).max(10000).default(0),
  note: z.string().trim().max(1000).default(''),
});

router.get('/', asyncHandler(async (req, res) => {
  const items = await Sale.find({ tenantId: req.tenantId }).populate('customerId', 'name').sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: items });
}));

router.post('/', allowRoles('BUSINESS_ADMIN', 'BRANCH_MANAGER', 'CASHIER'), asyncHandler(async (req, res) => {
  const input = saleSchema.parse(req.body);
  const created = await runAtomic(async (session) => {
      const ids = input.items.map((item) => item.productId);
      if (new Set(ids).size !== ids.length) throw new AppError(422, 'Each product can appear only once per invoice', 'DUPLICATE_PRODUCT');
      const products = await useSession(Product.find({ _id: { $in: ids }, tenantId: req.tenantId, isActive: true }), session);
      if (products.length !== ids.length) throw new AppError(422, 'One or more products are unavailable', 'PRODUCT_UNAVAILABLE');
      const map = new Map(products.map((product) => [product.id, product]));
      const lines = input.items.map((item) => {
        const product = map.get(item.productId);
        if (product.stock < item.quantity) throw new AppError(409, `Insufficient stock for ${product.name}`, 'INSUFFICIENT_STOCK');
        return { productId: product._id, name: product.name, quantity: item.quantity, unitPriceMinor: product.priceMinor, costMinor: product.costMinor, lineTotalMinor: product.priceMinor * item.quantity };
      });
      const { subtotalMinor, taxMinor, totalMinor } = calculateInvoiceTotals(lines, input.taxRateBps, input.discountMinor);
      if (input.paidMinor > totalMinor) throw new AppError(422, 'Paid amount exceeds total', 'INVALID_PAYMENT');
      const balanceDueMinor = totalMinor - input.paidMinor;
      let customer = null;
      if (input.customerId) {
        customer = await useSession(Customer.findOne({ _id: input.customerId, tenantId: req.tenantId, isActive: { $ne: false } }), session);
        if (!customer) throw new AppError(422, 'Customer not found', 'CUSTOMER_NOT_FOUND');
      }
      validateCredit(customer, balanceDueMinor);
      const counter = await Counter.findOneAndUpdate(
        { tenantId: req.tenantId, name: 'invoice' }, { $inc: { value: 1 } }, sessionOptions(session, { upsert: true, new: true }),
      );
      const invoiceNumber = `INV-${String(counter.value).padStart(6, '0')}`;
      const [sale] = await Sale.create([{
        tenantId: req.tenantId,
        invoiceNumber,
        customerId: input.customerId || null,
        items: lines,
        subtotalMinor,
        taxRateBps: input.taxRateBps,
        taxMinor,
        discountMinor: input.discountMinor,
        totalMinor,
        paidMinor: input.paidMinor,
        status: input.paidMinor === totalMinor ? 'PAID' : input.paidMinor > 0 ? 'PARTIAL' : 'UNPAID',
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber,
        invoiceDate: input.invoiceDate || new Date(),
        note: input.note,
        createdBy: req.user._id,
      }], sessionOptions(session));
      for (const line of lines) {
        const result = await Product.updateOne({ _id: line.productId, tenantId: req.tenantId, stock: { $gte: line.quantity } }, { $inc: { stock: -line.quantity } }, sessionOptions(session));
        if (result.modifiedCount !== 1) throw new AppError(409, `Stock changed for ${line.name}. Please retry.`, 'STOCK_CHANGED');
      }
      if (customer && balanceDueMinor > 0) {
        await Customer.updateOne(
          { _id: customer._id, tenantId: req.tenantId },
          { $inc: { balanceMinor: balanceDueMinor } },
          sessionOptions(session),
        );
      }
      return sale;
  });
  await writeAudit(req, { action: 'SALE_CREATED', entityType: 'Sale', entityId: created._id, after: created.toObject() });
  res.status(201).json({ success: true, data: created });
}));

export default router;
