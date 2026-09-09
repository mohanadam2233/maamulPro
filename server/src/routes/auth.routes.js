import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAccessToken, createRefreshToken, refreshCookieOptions, verifyRefreshToken } from '../utils/tokens.js';

const router = Router();
const loginSchema = z.object({ login: z.string().min(3), password: z.string().min(6) });

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email,
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

export default router;
