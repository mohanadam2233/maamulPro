import { Router } from 'express';
import { z } from 'zod';
import InventoryOption from '../models/InventoryOption.js';
import Product from '../models/Product.js';
import { allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAudit } from '../services/audit.js';

const router = Router();
const managers = allowRoles('BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STOREKEEPER');
const optionSchema = z.object({ type: z.enum(['CATEGORY', 'UNIT']), name: z.string().trim().min(2).max(80) });
const defaults = { categories: ['General'], units: ['Piece', 'Box', 'Bottle', 'Tablet', 'Strip', 'Pack'] };

router.get('/options', asyncHandler(async (req, res) => {
  const [saved, productCategories, productUnits] = await Promise.all([
    InventoryOption.find({ tenantId: req.tenantId, isActive: true }).sort({ name: 1 }).lean(),
    Product.distinct('category', { tenantId: req.tenantId, isActive: { $ne: false } }),
    Product.distinct('unit', { tenantId: req.tenantId, isActive: { $ne: false } }),
  ]);
  const unique = (values) => [...new Set(values.filter(Boolean).map((value) => String(value).trim()))].sort((a, b) => a.localeCompare(b));
  res.json({ success: true, data: {
    categories: unique([...defaults.categories, ...productCategories, ...saved.filter((item) => item.type === 'CATEGORY').map((item) => item.name)]),
    units: unique([...defaults.units, ...productUnits, ...saved.filter((item) => item.type === 'UNIT').map((item) => item.name)]),
  } });
}));

router.post('/options', managers, asyncHandler(async (req, res) => {
  const input = optionSchema.parse(req.body);
  const option = await InventoryOption.findOneAndUpdate(
    { tenantId: req.tenantId, type: input.type, name: input.name },
    { $set: { isActive: true }, $setOnInsert: { createdBy: req.user._id } },
    { upsert: true, new: true, runValidators: true },
  );
  await writeAudit(req, { action: 'INVENTORY_OPTION_SAVED', entityType: 'InventoryOption', entityId: option._id, after: option.toObject() });
  res.status(201).json({ success: true, data: option });
}));

export default router;
