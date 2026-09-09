import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  const payload = verifyAccessToken(header.slice(7));
  const user = await User.findById(payload.sub);
  if (!user?.isActive) throw new AppError(401, 'Account is unavailable', 'ACCOUNT_UNAVAILABLE');
  req.user = user;
  req.tenantId = user.tenantId?.toString() || null;
  next();
});

export const allowRoles = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new AppError(403, 'You do not have permission', 'FORBIDDEN'));
  next();
};

export const requireTenant = (req, _res, next) => {
  if (!req.tenantId) return next(new AppError(403, 'A tenant workspace is required', 'TENANT_REQUIRED'));
  next();
};
