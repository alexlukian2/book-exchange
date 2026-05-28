import { Router } from 'express';
import { getBooks, getBookById, getMyBooks, createBook, deleteBook } from '../controllers/books';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

// Публічні маршрути
router.get('/books', getBooks);
router.get('/books/:id', getBookById);

// Приватні маршрути (вимагають авторизації)
router.get('/me/books', authenticate, getMyBooks);

// При створенні книги можемо завантажувати фото ('photo' - назва поля у form-data)
router.post('/me/books', authenticate, upload.single('photo'), createBook);
router.delete('/me/books/:id', authenticate, deleteBook);

export default router;
