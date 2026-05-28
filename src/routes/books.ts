import { Router } from 'express';
import {
  getBooks,
  getBookById,
  getMyBooks,
  createBook,
  updateBook,
  deleteBook,
  requestExchange,
  getMyExchanges,
  handleExchangeAction,
} from '../controllers/books';
import { authenticate } from '../middlewares/auth';
import { upload, validateFileContent } from '../middlewares/upload';
import { exchangeLimiter } from '../middlewares/rateLimit';

const router = Router();

// Public routes
router.get('/books', getBooks);
router.get('/books/:id', getBookById);

// Authenticated routes — my books
router.get('/me/books', authenticate, getMyBooks);
router.post('/me/books', authenticate, upload.single('photo'), validateFileContent, createBook);
router.put('/me/books/:id', authenticate, upload.single('photo'), validateFileContent, updateBook);
router.delete('/me/books/:id', authenticate, deleteBook);

// Exchange routes
router.post('/books/:id/exchange', authenticate, exchangeLimiter, requestExchange);
router.get('/me/exchanges', authenticate, getMyExchanges);
router.patch('/exchanges/:id', authenticate, handleExchangeAction);

export default router;
