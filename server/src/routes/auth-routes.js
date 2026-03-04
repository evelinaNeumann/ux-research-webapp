import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { Study } from '../models/Study.js';
import { StudyAssignment } from '../models/StudyAssignment.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import {
  hasAcceptedPrivacy,
} from '../constants/privacy.js';
import { getCurrentPrivacyPolicy } from '../services/privacy-policy-service.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const PASSWORD_POLICY_MESSAGE =
  'Passwort muss beinhalten: mindestens 11 Zeichen, mindestens einen Großbuchstaben (A-Z), mindestens einen Kleinbuchstaben (a-z), mindestens eine Zahl (0-9), mindestens ein Sonderzeichen (z. B. !@#$%), und es darf den Benutzernamen nicht enthalten.';

function validatePassword(password, username) {
  if (!password || password.length < 11) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  if (username && password.toLowerCase().includes(username.toLowerCase())) return false;
  return true;
}

function issueAuthCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role, username: user.username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
  });

  return token;
}

function toAuthUser(user, policy) {
  const requiredRevision = Number(policy?.revision || 1);
  return {
    id: String(user._id),
    username: user.username,
    role: user.role,
    requires_privacy_consent: user.role === 'user' && !hasAcceptedPrivacy(user, requiredRevision),
    privacy_policy_version_acknowledged: user.privacy_notice_version_acknowledged || '',
    privacy_notice_acknowledged_at: user.privacy_notice_acknowledged_at || null,
    study_data_consent_version: user.study_data_consent_version || '',
    study_data_consent_at: user.study_data_consent_at || null,
    privacy_policy_revision_acknowledged: Number(user.privacy_policy_revision_acknowledged || 0),
    study_data_consent_revision_acknowledged: Number(user.study_data_consent_revision_acknowledged || 0),
    privacy_policy_version_current: String(policy?.version || ''),
    privacy_policy_date_current: String(policy?.date || ''),
    privacy_policy_revision_current: requiredRevision,
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) throw badRequest('username and password required');
    if (!validatePassword(password, username)) throw badRequest(PASSWORD_POLICY_MESSAGE);

    const exists = await User.findOne({ username });
    if (exists) throw badRequest('username exists');

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, password_hash, role: 'user' });
    const globalStudies = await Study.find({ is_active: true, assign_to_all_users: true }, { _id: 1 }).lean();
    if (globalStudies.length > 0) {
      await StudyAssignment.bulkWrite(
        globalStudies.map((study) => ({
          updateOne: {
            filter: { study_id: study._id, user_id: user._id },
            update: {
              $set: {
                is_active: true,
                assigned_at: new Date(),
              },
              $setOnInsert: {
                study_id: study._id,
                user_id: user._id,
                assigned_by: user._id,
              },
            },
            upsert: true,
          },
        }))
      );
    }
    const token = issueAuthCookie(res, user);
    const policy = await getCurrentPrivacyPolicy();

    res.status(201).json({ user: toAuthUser(user, policy), accessToken: token });
  } catch (err) {
    next(err);
  }
});

router.post('/register-admin', async (req, res, next) => {
  try {
    const { username, password, bootstrapKey } = req.body;
    if (!username || !password || !bootstrapKey) {
      throw badRequest('username, password and bootstrapKey required');
    }
    if (!validatePassword(password, username)) throw badRequest(PASSWORD_POLICY_MESSAGE);
    if (!env.adminBootstrapKey || bootstrapKey !== env.adminBootstrapKey) {
      throw unauthorized('invalid bootstrap key');
    }

    const adminExists = await User.exists({ role: 'admin' });
    if (adminExists) throw badRequest('admin already exists, use role delegation');

    const exists = await User.findOne({ username });
    if (exists) throw badRequest('username exists');

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, password_hash, role: 'admin' });

    res.status(201).json({ id: user._id, username: user.username, role: user.role });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) throw unauthorized('invalid credentials');
    if (user.password_reset_required) throw badRequest('Passwort-Reset erforderlich. Bitte zuerst neues Passwort vergeben.');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw unauthorized('invalid credentials');

    const token = issueAuthCookie(res, user);
    const policy = await getCurrentPrivacyPolicy();

    res.json({ accessToken: token, user: toAuthUser(user, policy) });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim();
    if (!username) throw badRequest('username required');
    const user = await User.findOne({ username });
    if (!user || user.role !== 'user') {
      return res.status(200).json({ message: 'Wenn der Nutzer existiert, wurde die Anfrage gespeichert.' });
    }
    user.password_reset_requested_at = new Date();
    user.password_reset_status = 'pending';
    user.password_reset_required = false;
    await user.save();
    return res.status(200).json({ message: 'Anfrage gespeichert. Admin-Freigabe erforderlich.' });
  } catch (err) {
    next(err);
  }
});

router.get('/password-reset-status/:username', async (req, res, next) => {
  try {
    const username = String(req.params.username || '').trim();
    if (!username) throw badRequest('username required');
    const user = await User.findOne({ username }, { password_reset_required: 1, password_reset_status: 1 });
    if (!user) return res.json({ requires_reset: false, status: 'none' });
    return res.json({
      requires_reset: !!user.password_reset_required,
      status: user.password_reset_status || 'none',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password-with-username', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!username || !newPassword) throw badRequest('username and newPassword required');
    const user = await User.findOne({ username });
    if (!user) throw badRequest('Benutzer nicht gefunden');
    if (!user.password_reset_required) {
      throw badRequest('Passwort-Reset ist für diesen Nutzer nicht freigegeben');
    }
    if (!validatePassword(newPassword, user.username)) throw badRequest(PASSWORD_POLICY_MESSAGE);

    user.password_hash = await bcrypt.hash(newPassword, 12);
    user.password_reset_required = false;
    user.password_reset_status = 'none';
    user.password_reset_requested_at = null;
    await user.save();

    return res.status(200).json({ message: 'Neues Passwort gespeichert. Du kannst dich jetzt anmelden.' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.status(204).send();
});

router.get('/privacy-policy', async (_req, res, next) => {
  try {
    const policy = await getCurrentPrivacyPolicy();
    res.json(policy);
  } catch (err) {
    next(err);
  }
});

router.post('/privacy-consent', requireAuth, async (req, res, next) => {
  try {
    const acceptedPrivacy = !!req.body?.accepted_privacy_notice;
    const acceptedStudyConsent = !!req.body?.accepted_study_data_consent;
    if (!acceptedPrivacy || !acceptedStudyConsent) {
      throw badRequest('both privacy acknowledgements are required');
    }
    const user = await User.findById(req.auth.sub);
    if (!user) throw unauthorized();
    if (user.role !== 'user') throw badRequest('privacy consent flow applies only to users');

    const policy = await getCurrentPrivacyPolicy();
    user.privacy_notice_version_acknowledged = String(policy.version || '');
    user.privacy_notice_acknowledged_at = new Date();
    user.privacy_policy_revision_acknowledged = Number(policy.revision || 1);
    user.study_data_consent_version = String(policy.version || '');
    user.study_data_consent_at = new Date();
    user.study_data_consent_revision_acknowledged = Number(policy.revision || 1);
    await user.save();

    return res.json({
      message: 'privacy consent stored',
      user: toAuthUser(user, policy),
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw badRequest('currentPassword and newPassword required');

    const user = await User.findById(req.auth.sub);
    if (!user) throw unauthorized();

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw unauthorized('current password is invalid');
    if (!validatePassword(newPassword, user.username)) throw badRequest(PASSWORD_POLICY_MESSAGE);

    user.password_hash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ message: 'password changed' });
  } catch (err) {
    next(err);
  }
});

router.post('/change-user-data', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, newUsername } = req.body;
    if (!currentPassword) throw badRequest('Gib dein aktuelles Passwort ein, um die Änderung zu bestätigen.');

    const user = await User.findById(req.auth.sub);
    if (!user) throw unauthorized();

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw unauthorized('current password is invalid');

    const nextUsername = String(newUsername || '').trim();
    const wantsUsernameChange = !!nextUsername && nextUsername !== user.username;
    const wantsPasswordChange = !!String(newPassword || '').trim();
    if (!wantsUsernameChange && !wantsPasswordChange) {
      throw badRequest('Keine Änderungen angegeben');
    }

    if (wantsUsernameChange) {
      const exists = await User.findOne({ username: nextUsername, _id: { $ne: user._id } });
      if (exists) throw badRequest('username exists');
      user.username = nextUsername;
    }

    if (wantsPasswordChange) {
      const passwordCandidate = String(newPassword || '');
      if (!validatePassword(passwordCandidate, user.username)) throw badRequest(PASSWORD_POLICY_MESSAGE);
      user.password_hash = await bcrypt.hash(passwordCandidate, 12);
    }

    await user.save();
    const token = issueAuthCookie(res, user);
    const policy = await getCurrentPrivacyPolicy();

    res.status(200).json({
      message: 'user data updated',
      user: toAuthUser(user, policy),
      accessToken: token,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(200).json({ authenticated: false });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return User.findById(payload.sub)
      .then(async (user) => {
        if (!user) return res.status(200).json({ authenticated: false });
        const policy = await getCurrentPrivacyPolicy();
        return res.json({ authenticated: true, user: toAuthUser(user, policy) });
      })
      .catch(() => res.status(200).json({ authenticated: false }));
  } catch {
    return res.status(200).json({ authenticated: false });
  }
});

export default router;
