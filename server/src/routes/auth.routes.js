import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAccessToken, createRefreshToken, refreshCookieOptions, verifyRefreshToken } from '../utils/tokens.js';
import { writeAudit } from '../services/audit.js';

const router = Router();
const loginSchema = z.object({ login: z.string().min(3), password: z.string().min(6) });
const avatarSchema = z.string().max(400_000).refine(
  (value) => !value || /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value),
  'Profile image must be a valid JPEG, PNG or WebP image',
);
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/, 'Username contains unsupported characters'),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().trim().max(30).default(''),
  avatarDataUrl: avatarSchema.default(''),
}).strict();
const passwordSchema = z.object({
  currentPassword: z.string().min(6).max(128),
  newPassword: z.string().min(8, 'New password must contain at least 8 characters').max(128),
}).strict();
const verifyPasswordSchema = z.object({ password: z.string().min(6).max(128) }).strict();

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email,
  phone: user.phone || '',
  avatarDataUrl: user.avatarDataUrl || '',
  role: user.role,
  tenantId: user.tenantId,
  permissions: user.permissions,
});

router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const key = input.login.toLowerCase();
  const user = await User.findOne({ $or: [{ email: key }, { username: key }] }).select('+password +tokenVersion');
  if (!user?.isActive || !(await user.verifyPassword(input.password))) {
    throw new AppError(401, 'Invalid email/username or password', 'INVALID_CREDENTIALS');
  }
  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });
  res.cookie('maamulpro_refresh', createRefreshToken(user, user.tokenVersion), refreshCookieOptions);
  res.json({ success: true, data: { accessToken: createAccessToken(user), user: publicUser(user) } });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies.maamulpro_refresh;
  if (!token) return res.json({ success: true, data: null });
  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user?.isActive || user.tokenVersion !== payload.version) throw new AppError(401, 'Session expired', 'INVALID_SESSION');
  res.cookie('maamulpro_refresh', createRefreshToken(user, user.tokenVersion), refreshCookieOptions);
  res.json({ success: true, data: { accessToken: createAccessToken(user), user: publicUser(user) } });
}));

router.post('/logout', (_req, res) => {
  res.clearCookie('maamulpro_refresh', refreshCookieOptions);
  res.status(204).end();
});

router.get('/me', authenticate, (req, res) => res.json({ success: true, data: publicUser(req.user) }));

router.patch('/profile', authenticate, asyncHandler(async (req, res) => {
  const input = profileSchema.parse(req.body);
  const before = {
    name: req.user.name,
    username: req.user.username,
    email: req.user.email,
    phone: req.user.phone || '',
    hasAvatar: Boolean(req.user.avatarDataUrl),
  };

  req.user.name = input.name;
  req.user.username = input.username;
  req.user.email = input.email;
  req.user.phone = input.phone;
  req.user.avatarDataUrl = input.avatarDataUrl;
  await req.user.save();

  await writeAudit(req, {
    action: 'PROFILE_UPDATED',
    entityType: 'User',
    entityId: req.user._id,
    before,
    after: {
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      phone: req.user.phone,
      hasAvatar: Boolean(req.user.avatarDataUrl),
    },
  });

  res.json({ success: true, data: publicUser(req.user) });
}));

router.patch('/password', authenticate, asyncHandler(async (req, res) => {
  const input = passwordSchema.parse(req.body);
  const account = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!account || !(await account.verifyPassword(input.currentPassword))) {
    throw new AppError(400, 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  }
  if (await account.verifyPassword(input.newPassword)) {
    throw new AppError(400, 'New password must be different from the current password', 'PASSWORD_UNCHANGED');
  }

  account.password = input.newPassword;
  account.tokenVersion += 1;
  await account.save();

  await writeAudit(req, {
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: account._id,
  });

  res.cookie('maamulpro_refresh', createRefreshToken(account, account.tokenVersion), refreshCookieOptions);
  res.json({ success: true, data: { accessToken: createAccessToken(account), user: publicUser(account) } });
}));

router.post('/verify-password', authenticate, asyncHandler(async (req, res) => {
  const input = verifyPasswordSchema.parse(req.body);
  const account = await User.findById(req.user._id).select('+password');
  if (!account || !(await account.verifyPassword(input.password))) {
    throw new AppError(401, 'Password is incorrect', 'INVALID_PASSWORD');
  }
  res.json({ success: true, data: { verified: true } });
}));

export default router;
