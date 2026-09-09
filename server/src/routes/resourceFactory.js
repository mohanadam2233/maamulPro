import { Router } from 'express';
import { z } from 'zod';
import { allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../services/audit.js';

const managers = allowRoles('BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STOREKEEPER');

export function createResourceRouter({ Model, createSchema, updateSchema = createSchema.partial(), searchFields = ['name'], dateField = null }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const query = { tenantId: req.tenantId, isActive: { $ne: false } };
    if (dateField && (req.query.from || req.query.to)) {
      query[dateField] = {};
      if (req.query.from) query[dateField].$gte = new Date(`${req.query.from}T00:00:00.000Z`);
      if (req.query.to) query[dateField].$lte = new Date(`${req.query.to}T23:59:59.999Z`);
    }
    if (req.query.search) {
      const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = searchFields.map((field) => ({ [field]: { $regex: escaped, $options: 'i' } }));
    }
    const [items, total] = await Promise.all([
      Model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Model.countDocuments(query),
    ]);
    res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  }));

  router.post('/', managers, asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const item = await Model.create({ ...input, tenantId: req.tenantId, createdBy: req.user._id });
    await writeAudit(req, { action: `${Model.modelName.toUpperCase()}_CREATED`, entityType: Model.modelName, entityId: item._id, after: item.toObject() });
    res.status(201).json({ success: true, data: item });
  }));

  router.patch('/:id', managers, asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const before = await Model.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
    if (!before) throw new AppError(404, `${Model.modelName} not found`, 'NOT_FOUND');
    const item = await Model.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, input, { new: true, runValidators: true });
    await writeAudit(req, { action: `${Model.modelName.toUpperCase()}_UPDATED`, entityType: Model.modelName, entityId: item._id, before, after: item.toObject() });
    res.json({ success: true, data: item });
  }));

  router.delete('/:id', allowRoles('BUSINESS_ADMIN'), asyncHandler(async (req, res) => {
    const item = await Model.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { isActive: false }, { new: true });
    if (!item) throw new AppError(404, `${Model.modelName} not found`, 'NOT_FOUND');
    await writeAudit(req, { action: `${Model.modelName.toUpperCase()}_DEACTIVATED`, entityType: Model.modelName, entityId: item._id, after: item.toObject() });
    res.json({ success: true, data: item });
  }));

  return router;
}

export { z };
