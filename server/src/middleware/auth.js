import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';

export function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) throw unauthorized();
    const payload = jwt.verify(token, env.jwtSecret);
    req.auth = payload;
    next();
  } catch {
    next(unauthorized());
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(unauthorized());
    }
    next();
  };
}
