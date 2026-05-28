import { Request, Response } from 'express';
import * as bookService from '../services/book.service';
import * as exchangeService from '../services/exchange.service';
import { createBookSchema, updateBookSchema, paginationSchema } from '../schemas/book';
import { exchangeActionSchema } from '../schemas/exchange';
import { prisma } from '../utils/prisma';

// GET /books — public, paginated, searchable
export const getBooks = async (req: Request, res: Response) => {
  try {
    const query = paginationSchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: query.error.format() });
      return;
    }

    const { page, limit, search } = query.data;
    const { books, total } = await bookService.getBooks(page, limit, search);

    res.json({
      data: books,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getBooks error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /books/:id — public
export const getBookById = async (req: Request, res: Response) => {
  try {
    const book = await bookService.getBookById(req.params.id as string);

    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /me/books — authenticated
export const getMyBooks = async (req: Request, res: Response) => {
  try {
    const books = await bookService.getMyBooks(req.auth!.userId);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /me/books — authenticated, with optional photo upload
export const createBook = async (req: Request, res: Response) => {
  try {
    const parseResult = createBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input', details: parseResult.error.format() });
      return;
    }

    const { title, author, description, condition } = parseResult.data;

    const book = await bookService.createBook({
      title,
      author,
      description,
      condition,
      ownerId: req.auth!.userId,
      file: req.file
        ? { buffer: req.file.buffer, mimetype: req.file.mimetype }
        : undefined,
    });

    res.status(201).json(book);
  } catch (error) {
    console.error('createBook error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /me/books/:id — authenticated, owner only
export const updateBook = async (req: Request, res: Response) => {
  try {
    const parseResult = updateBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input', details: parseResult.error.format() });
      return;
    }

    const result = await bookService.updateBook(
      req.params.id as string,
      req.auth!.userId,
      parseResult.data,
      req.file
        ? { buffer: req.file.buffer, mimetype: req.file.mimetype }
        : undefined
    );

    if (result.status === 'NOT_FOUND') {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    if (result.status === 'FORBIDDEN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json(result.book);
  } catch (error) {
    console.error('updateBook error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteBook = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    const userRole = user?.role || 'USER';

    const result = await bookService.deleteBook(req.params.id as string, req.auth!.userId, userRole);

    if (result === 'NOT_FOUND') {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    if (result === 'FORBIDDEN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /books/:id/exchange — authenticated, rate-limited
export const requestExchange = async (req: Request, res: Response) => {
  try {
    const result = await exchangeService.requestExchange(
      req.auth!.userId,
      req.params.id as string
    );

    switch (result.status) {
      case 'NOT_FOUND':
        res.status(404).json({ error: 'Book not found' });
        return;
      case 'UNAVAILABLE':
        res.status(400).json({ error: 'Book is not available for exchange' });
        return;
      case 'OWN_BOOK':
        res.status(400).json({ error: 'You cannot request your own book' });
        return;
      case 'DUPLICATE':
        res.status(400).json({ error: 'You already requested this book' });
        return;
      case 'OK':
        res.status(201).json({
          message: 'Exchange request sent',
          exchangeRequest: result.exchangeRequest,
        });
        return;
    }
  } catch (error) {
    console.error('requestExchange error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /me/exchanges — authenticated
export const getMyExchanges = async (req: Request, res: Response) => {
  try {
    const exchanges = await exchangeService.getMyExchanges(req.auth!.userId);
    res.json(exchanges);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PATCH /exchanges/:id — authenticated, accept or reject
export const handleExchangeAction = async (req: Request, res: Response) => {
  try {
    const parseResult = exchangeActionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input', details: parseResult.error.format() });
      return;
    }

    const result = await exchangeService.updateExchangeStatus(
      req.params.id as string,
      req.auth!.userId,
      parseResult.data.action
    );

    switch (result.status) {
      case 'NOT_FOUND':
        res.status(404).json({ error: 'Exchange request not found' });
        return;
      case 'FORBIDDEN':
        res.status(403).json({ error: 'Only the book owner can accept or reject' });
        return;
      case 'ALREADY_PROCESSED':
        res.status(400).json({ error: 'This request has already been processed' });
        return;
      case 'OK':
        res.json(result.exchangeRequest);
        return;
    }
  } catch (error) {
    console.error('handleExchangeAction error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
