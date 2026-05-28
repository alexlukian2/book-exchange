import { z } from 'zod';

export const createBookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  author: z.string().min(1, 'Author is required').max(255),
});

export const updateBookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  author: z.string().min(1, 'Author is required').max(255).optional(),
});
