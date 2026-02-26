import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest, unauthorized } from '../utils/errors.js';

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
    secure: false,
    maxAge: 8 * 60 * 60 * 1000,
  });

  return token;
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
    const token = issueAuthCookie(res, user);

    res.status(201).json({ id: user._id, username: user.username, role: user.role, accessToken: token });
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

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw unauthorized('invalid credentials');

    const token = issueAuthCookie(res, user);

    res.json({ accessToken: token, role: user.role, username: user.username });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.status(204).send();
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

router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(200).json({ authenticated: false });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return res.json({ authenticated: true, user: payload });
  } catch {
    return res.status(200).json({ authenticated: false });
  }
});

export default router;
