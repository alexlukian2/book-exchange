import { describe, it, expect, jest } from '@jest/globals';
import { prismaMock } from '../../utils/__mocks__/prisma';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));
jest.mock('../../utils/s3', () => ({ uploadFileToS3: jest.fn() }));

import * as bookService from '../book.service';
import { BookCondition } from '@prisma/client';

describe('Book Service', () => {
  describe('getBookById', () => {
    it('should return a book if it exists', async () => {
      const mockBook = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Desc',
        condition: BookCondition.GOOD,
        photoUrl: null,
        isAvailable: true,
        ownerId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user1',
          name: 'Test User',
          avatarUrl: null,
        },
      };

      prismaMock.book.findUnique.mockResolvedValue(
        mockBook as unknown as ReturnType<typeof prismaMock.book.findUnique> extends Promise<
          infer U
        >
          ? U
          : never
      );

      const result = await bookService.getBookById('1');

      expect(prismaMock.book.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });
      expect(result).toEqual(mockBook);
    });

    it('should return null if book does not exist', async () => {
      prismaMock.book.findUnique.mockResolvedValue(null);

      const result = await bookService.getBookById('non-existent');

      expect(result).toBeNull();
    });
  });
});
