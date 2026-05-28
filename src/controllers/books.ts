import { getAuth } from '@clerk/express';

import { Request, Response } from 'express';
import * as bookService from '../services/book.service';
import * as exchangeService from '../services/exchange.service';
import { createBookSchema, updateBookSchema, paginationSchema } from '../schemas/book';
import { exchangeActionSchema } from '../schemas/exchange';
import { prisma } from '../utils/prisma';

// GET /books — public, paginated, searchable
export const getBooks = async (req: Request, res: Response) => {
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
};

// GET /books/:id — public
export const getBookById = async (req: Request, res: Response) => {
  const book = await bookService.getBookById(req.params.id as string);

  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  res.json(book);
};

// GET /me/books — authenticated
export const getMyBooks = async (req: Request, res: Response) => {
  const books = await bookService.getMyBooks(getAuth(req).userId!);
  res.json(books);
};

// POST /me/books — authenticated, with optional photo upload
export const createBook = async (req: Request, res: Response) => {
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
    ownerId: getAuth(req).userId!,
    file: req.file ? { buffer: req.file.buffer, mimetype: req.file.mimetype } : undefined,
  });

  res.status(201).json(book);
};

// PUT /me/books/:id — authenticated, owner only
export const updateBook = async (req: Request, res: Response) => {
  const parseResult = updateBookSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid input', details: parseResult.error.format() });
    return;
  }

  const result = await bookService.updateBook(
    req.params.id as string,
    getAuth(req).userId!,
    parseResult.data,
    req.file ? { buffer: req.file.buffer, mimetype: req.file.mimetype } : undefined
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
};

export const deleteBook = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: getAuth(req).userId! } });
  const userRole = user?.role || 'USER';

  const result = await bookService.deleteBook(
    req.params.id as string,
    getAuth(req).userId!,
    userRole
  );

  if (result === 'NOT_FOUND') {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  if (result === 'FORBIDDEN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.status(204).send();
};

// POST /books/:id/exchange — authenticated, rate-limited
export const requestExchange = async (req: Request, res: Response) => {
  const result = await exchangeService.requestExchange(
    getAuth(req).userId!,
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
};

// GET /me/exchanges — authenticated
export const getMyExchanges = async (req: Request, res: Response) => {
  const exchanges = await exchangeService.getMyExchanges(getAuth(req).userId!);
  res.json(exchanges);
};

// PATCH /exchanges/:id — authenticated, accept or reject
export const handleExchangeAction = async (req: Request, res: Response) => {
  const parseResult = exchangeActionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid input', details: parseResult.error.format() });
    return;
  }

  const result = await exchangeService.updateExchangeStatus(
    req.params.id as string,
    getAuth(req).userId!,
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
};
