import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';
import { User } from '../models/User.js';
import { hasAcceptedPrivacy } from '../constants/privacy.js';
import { getCurrentPrivacyPolicy } from '../services/privacy-policy-service.js';

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

export async function requirePrivacyConsent(req, _res, next) {
  try {
    if (!req.auth || req.auth.role !== 'user') return next();
    const user = await User.findById(req.auth.sub, {
      privacy_notice_version_acknowledged: 1,
      privacy_notice_acknowledged_at: 1,
      privacy_policy_revision_acknowledged: 1,
      study_data_consent_version: 1,
      study_data_consent_at: 1,
      study_data_consent_revision_acknowledged: 1,
    });
    const policy = await getCurrentPrivacyPolicy();
    if (!hasAcceptedPrivacy(user, Number(policy.revision || 1))) {
      return next(unauthorized('privacy consent required'));
    }
    return next();
  } catch {
    return next(unauthorized());
  }
}
