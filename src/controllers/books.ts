import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createBookSchema, updateBookSchema } from '../schemas/book';
import { uploadFileToS3 } from '../utils/s3';
import { sendExchangeRequestEmail } from '../utils/email';

// GET /books
export const getBooks = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const skip = (page - 1) * limit;

    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { author: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: { owner: { select: { id: true, name: true, avatarUrl: true } } }
      }),
      prisma.book.count({ where: whereClause })
    ]);

    res.json({
      data: books,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getBooks error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /books/:id
export const getBookById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, avatarUrl: true } } }
    });

    if (!book) {
       res.status(404).json({ error: 'Book not found' });
       return;
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /me/books
export const getMyBooks = async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth;
    const books = await prisma.book.findMany({
      where: { ownerId: auth.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /me/books
export const createBook = async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth;
    
    // Валідація тіла запиту
    const parseResult = createBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input', details: parseResult.error.errors });
      return;
    }

    const { name, author } = parseResult.data;
    let photoUrl = null;

    // Якщо завантажено файл, відправляємо його в S3
    if (req.file) {
      photoUrl = await uploadFileToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    const book = await prisma.book.create({
      data: {
        name,
        author,
        photoUrl,
        ownerId: auth.userId
      }
    });

    res.status(201).json(book);
  } catch (error) {
    console.error('createBook error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /me/books/:id
export const deleteBook = async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth;
    const { id } = req.params;

    const book = await prisma.book.findUnique({ where: { id } });

    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    if (book.ownerId !== auth.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.book.delete({ where: { id } });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /books/:id/exchange
export const requestExchange = async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth;
    const targetBookId = req.params.id;

    const targetBook = await prisma.book.findUnique({
      where: { id: targetBookId },
      include: { owner: true }
    });

    if (!targetBook) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    if (targetBook.ownerId === auth.userId) {
      res.status(400).json({ error: 'You cannot request your own book' });
      return;
    }

    // Перевірка чи вже є такий активний запит
    const existingRequest = await prisma.exchangeRequest.findFirst({
      where: {
        senderId: auth.userId,
        targetBookId: targetBookId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      res.status(400).json({ error: 'You already requested this book' });
      return;
    }

    // Створюємо запит в базі
    const exchangeRequest = await prisma.exchangeRequest.create({
      data: {
        senderId: auth.userId,
        receiverId: targetBook.ownerId,
        targetBookId: targetBookId,
      }
    });

    // Отримуємо інформацію про відправника та його книги
    const requestor = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { books: true }
    });

    if (requestor) {
      // Відправляємо email власнику книги
      await sendExchangeRequestEmail(
        targetBook.owner.email,
        targetBook.owner.name,
        requestor.name,
        requestor.email,
        targetBook.name,
        requestor.books
      );
    }

    res.status(201).json({ message: 'Exchange request sent', exchangeRequest });
  } catch (error) {
    console.error('requestExchange error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
