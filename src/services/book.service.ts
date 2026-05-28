import { prisma } from '../utils/prisma';
import { uploadFileToS3 } from '../utils/s3';

const BOOK_OWNER_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
};

/**
 * Get paginated list of books with optional search.
 */
export async function getBooks(page: number, limit: number, search?: string) {
  const skip = (page - 1) * limit;

  const whereClause = search
    ? {
        isAvailable: true,
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { author: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : { isAvailable: true };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where: whereClause,
      orderBy: { title: 'asc' },
      skip,
      take: limit,
      include: { owner: { select: BOOK_OWNER_SELECT } },
    }),
    prisma.book.count({ where: whereClause }),
  ]);

  return { books, total };
}

/**
 * Get a single book by ID.
 */
export async function getBookById(id: string) {
  return prisma.book.findUnique({
    where: { id },
    include: { owner: { select: BOOK_OWNER_SELECT } },
  });
}

/**
 * Get all books owned by a specific user.
 */
export async function getMyBooks(ownerId: string) {
  return prisma.book.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create a new book, optionally uploading a photo to S3.
 */
export async function createBook(data: {
  title: string;
  author: string;
  description?: string;
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  ownerId: string;
  file?: { buffer: Buffer; mimetype: string };
}) {
  let photoUrl: string | null = null;

  if (data.file) {
    photoUrl = await uploadFileToS3(data.file.buffer, data.file.mimetype);
  }

  return prisma.book.create({
    data: {
      title: data.title,
      author: data.author,
      description: data.description || null,
      condition: data.condition || 'GOOD',
      photoUrl,
      ownerId: data.ownerId,
    },
  });
}

/**
 * Update book details. Only the owner can update their book.
 * Returns null if not found, throws 'FORBIDDEN' if not owner.
 */
export async function updateBook(
  bookId: string,
  ownerId: string,
  data: {
    title?: string;
    author?: string;
    description?: string;
    condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
    isAvailable?: boolean;
  },
  file?: { buffer: Buffer; mimetype: string }
) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });

  if (!book) return { status: 'NOT_FOUND' as const };
  if (book.ownerId !== ownerId) return { status: 'FORBIDDEN' as const };

  let photoUrl = book.photoUrl;
  if (file) {
    photoUrl = await uploadFileToS3(file.buffer, file.mimetype);
  }

  const updated = await prisma.book.update({
    where: { id: bookId },
    data: {
      ...data,
      photoUrl,
    },
  });

  return { status: 'OK' as const, book: updated };
}

/**
 * Delete a book. Only the owner can delete their book.
 */
export async function deleteBook(bookId: string, userId: string, userRole: 'USER' | 'ADMIN') {
  const book = await prisma.book.findUnique({ where: { id: bookId } });

  if (!book) return 'NOT_FOUND' as const;
  
  // Admins can delete any book. Regular users can only delete their own.
  if (userRole !== 'ADMIN' && book.ownerId !== userId) {
    return 'FORBIDDEN' as const;
  }

  await prisma.book.delete({ where: { id: bookId } });
  return 'OK' as const;
}
