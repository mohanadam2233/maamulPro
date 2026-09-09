import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../services/audit.js';

const router = Router();
const createSchema = z.object({
  phone: z.string().trim().max(40).default(''),
  name: z.string().min(2), username: z.string().min(3), email: z.string().email(), password: z.string().min(8),
  role: z.enum(['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'ACCOUNTANT', 'STOREKEEPER', 'AUDITOR']),
});

router.use(allowRoles('BUSINESS_ADMIN'));
router.get('/', asyncHandler(async (req, res) => {
  const users = await User.find({ tenantId: req.tenantId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: users });
}));
router.post('/', asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  const user = await User.create({ ...input, tenantId: req.tenantId });
  await writeAudit(req, { action: 'USER_CREATED', entityType: 'User', entityId: user._id, after: { name: user.name, email: user.email, role: user.role } });
  res.status(201).json({ success: true, data: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, isActive: user.isActive } });
}));
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const isActive = z.boolean().parse(req.body.isActive);
  if (req.params.id === req.user.id) throw new AppError(422, 'You cannot deactivate your own account', 'SELF_DEACTIVATION');
  const user = await User.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { isActive, $inc: { tokenVersion: 1 } }, { new: true });
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  await writeAudit(req, { action: isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED', entityType: 'User', entityId: user._id, after: { isActive } });
  res.json({ success: true, data: user });
}));
export default router;
