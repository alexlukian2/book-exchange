import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Store files in memory (to send directly to S3)
const storage = multer.memoryStorage();

// Allowed MIME types (allow-list per security requirements)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'));
  }
};

// File size limit: 5 MB (prevents DoS via large uploads)
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter,
});

/**
 * Middleware to validate file content via magic bytes after multer processes it.
 * The client-provided MIME type is untrusted — we verify actual file content.
 * Uses dynamic import for file-type (ESM module).
 */
export const validateFileContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.file) {
    next();
    return;
  }

  try {
    // file-type is ESM-only — use dynamic import to load in CJS context

    const fileType = await (new Function('return import("file-type")')() as Promise<{
      fileTypeFromBuffer: (buf: Uint8Array) => Promise<{ mime: string; ext: string } | undefined>;
    }>);
    const detectedType = await fileType.fileTypeFromBuffer(req.file.buffer);

    if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      res.status(400).json({
        error: 'Invalid file content. File does not match an allowed image type.',
      });
      return;
    }

    // Override the client-provided MIME type with the detected one
    req.file.mimetype = detectedType.mime;
    next();
  } catch (error) {
    console.error('File validation error:', error);
    res.status(500).json({ error: 'Failed to validate file content' });
  }
};
