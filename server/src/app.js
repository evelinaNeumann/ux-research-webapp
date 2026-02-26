import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import authRoutes from './routes/auth-routes.js';
import studyRoutes from './routes/study-routes.js';
import sessionRoutes from './routes/session-routes.js';
import researchRoutes from './routes/research-routes.js';
import analyticsRoutes from './routes/analytics-routes.js';
import adminContentRoutes from './routes/admin-content-routes.js';
import profileRoutes from './routes/profile-routes.js';
import { errorHandler } from './middleware/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/studies', studyRoutes);
app.use('/sessions', sessionRoutes);
app.use('/', researchRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/admin', adminContentRoutes);
app.use('/profiles', profileRoutes);

app.use(errorHandler);
