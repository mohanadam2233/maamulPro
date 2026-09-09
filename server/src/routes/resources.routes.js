import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Vendor from '../models/Vendor.js';
import Expense from '../models/Expense.js';
import { createResourceRouter, z } from './resourceFactory.js';
import { allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../services/audit.js';
import { getTopCustomers } from '../services/topCustomers.js';

export const productRoutes = createResourceRouter({
  Model: Product,
  searchFields: ['name', 'sku', 'barcode', 'category'],
  createSchema: z.object({
    name: z.string().min(2), sku: z.string().min(1), barcode: z.string().min(1), category: z.string().default('General'), unit: z.string().min(1).default('Piece'),
    costMinor: z.number().int().min(0), priceMinor: z.number().int().min(0), stock: z.number().int().min(0), minimumStock: z.number().int().min(0).default(5),
    expiresAt: z.coerce.date().nullable().optional(),
  }),
});

const stockManagers = allowRoles('BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STOREKEEPER');
// Tenant-scoped stock alerts; the badge is the real count, not a placeholder.
productRoutes.get('/alerts', asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenantId, isActive: true, $expr: { $lte: ['$stock', '$minimumStock'] } };
  const [items, total] = await Promise.all([
    Product.find(filter).select('name stock minimumStock').sort({ stock: 1, name: 1 }).limit(20).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, meta: { total } });
}));
const stockAdjustmentSchema = z.object({ adjustment: z.number().int().refine((value) => value !== 0), reason: z.string().trim().min(2).max(250) });

productRoutes.patch('/:id/stock', stockManagers, asyncHandler(async (req, res) => {
  const input = stockAdjustmentSchema.parse(req.body);
  const before = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId, isActive: true }).lean();
  if (!before) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  if (before.stock + input.adjustment < 0) throw new AppError(409, 'Stock adjustment cannot make inventory negative', 'INSUFFICIENT_STOCK');

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, isActive: true, ...(input.adjustment < 0 ? { stock: { $gte: Math.abs(input.adjustment) } } : {}) },
    { $inc: { stock: input.adjustment } },
    { new: true, runValidators: true },
  );
  if (!product) throw new AppError(409, 'Stock changed before the adjustment was saved. Please retry.', 'STOCK_CHANGED');

  await writeAudit(req, {
    action: 'PRODUCT_STOCK_ADJUSTED', entityType: 'Product', entityId: product._id,
    before, after: product.toObject(), reason: `${input.reason} (adjustment: ${input.adjustment})`,
  });
  res.json({ success: true, data: product });
}));

export const customerRoutes = createResourceRouter({
  Model: Customer,
  searchFields: ['name', 'phone', 'email'],
  createSchema: z.object({
    name: z.string().min(2), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(), balanceMinor: z.number().int().min(0).default(0),
    creditLimitMinor: z.number().int().min(0).default(0),
  }),
});

customerRoutes.get('/top', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getTopCustomers(req.tenantId) });
}));

export const vendorRoutes = createResourceRouter({
  Model: Vendor,
  searchFields: ['name', 'phone', 'email'],
  createSchema: z.object({
    name: z.string().min(2), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')), address: z.string().optional(),
  }),
});

export const expenseRoutes = createResourceRouter({
  Model: Expense,
  searchFields: ['category', 'description', 'method'],
  dateField: 'paidAt',
  createSchema: z.object({
    category: z.string().min(2), description: z.string().min(2), amountMinor: z.number().int().min(1),
    currency: z.string().length(3).default('USD'), method: z.string().default('Cash'), paidAt: z.coerce.date().optional(),
  }),
});
