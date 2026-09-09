import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const createAccessToken = (user) => jwt.sign(
  { sub: user.id, role: user.role, tenantId: user.tenantId || null },
  env.JWT_ACCESS_SECRET,
  { expiresIn: `${env.ACCESS_TOKEN_MINUTES}m`, issuer: 'maamulpro' },
);

export const createRefreshToken = (user, tokenVersion) => jwt.sign(
  { sub: user.id, version: tokenVersion },
  env.JWT_REFRESH_SECRET,
  { expiresIn: `${env.REFRESH_TOKEN_DAYS}d`, issuer: 'maamulpro' },
);

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'maamulpro' });
export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'maamulpro' });

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
};
