import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const destination = path.resolve(__dirname, '../../uploads/task-files');
fs.mkdirSync(destination, { recursive: true });

const storage = multer.diskStorage({
  destination,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = ext === '.pdf' || ext === '.html' || ext === '.htm';
  const allowedMime =
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'text/html' ||
    file.mimetype === 'application/xhtml+xml';
  cb(null, allowedExt || allowedMime);
};

export const uploadTaskFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});
