import { z } from 'zod';

/** Allowed book conditions for exchange */
export const BookCondition = z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']);
export type BookConditionType = z.infer<typeof BookCondition>;

export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  author: z.string().min(1, 'Author is required').max(255),
  description: z.string().max(2000).optional(),
  condition: BookCondition.optional().default('GOOD'),
});

export const updateBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  author: z.string().min(1, 'Author is required').max(255).optional(),
  description: z.string().max(2000).optional(),
  condition: BookCondition.optional(),
  isAvailable: z.boolean().optional(),
});

/** Pagination query params — reusable across endpoints */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(255).optional(),
});
