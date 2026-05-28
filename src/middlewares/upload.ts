import multer from 'multer';
import path from 'path';

// Зберігаємо файли в пам'яті (щоб потім одразу відправити в S3)
const storage = multer.memoryStorage();

// Дозволені типи файлів (Allow-list згідно з вимогами безпеки)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'));
  }
};

// Ліміт на розмір файлу: 5 МБ (щоб уникнути DoS-атак великими файлами)
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter,
});
