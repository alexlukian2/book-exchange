import { describe, it, expect, jest } from '@jest/globals';
import { prismaMock } from '../../utils/__mocks__/prisma';

jest.mock('../../utils/email', () => ({
  sendExchangeRequestEmail: jest.fn(),
  sendExchangeStatusEmail: jest.fn(),
}));

import * as exchangeService from '../exchange.service';

describe('Exchange Service', () => {
  describe('requestExchange', () => {
    it('should return NOT_FOUND if target book does not exist', async () => {
      prismaMock.book.findUnique.mockResolvedValue(null);

      const result = await exchangeService.requestExchange('senderId', 'missingBookId');
      expect(result.status).toBe('NOT_FOUND');
    });

    it('should return UNAVAILABLE if book is not available', async () => {
      const mockBook = {
        id: 'bookId',
        isAvailable: false,
        ownerId: 'ownerId',
      };

      prismaMock.book.findUnique.mockResolvedValue(
        mockBook as unknown as ReturnType<typeof prismaMock.book.findUnique> extends Promise<
          infer U
        >
          ? U
          : never
      );

      const result = await exchangeService.requestExchange('senderId', 'bookId');
      expect(result.status).toBe('UNAVAILABLE');
    });

    it('should return OWN_BOOK if sender is the owner', async () => {
      const mockBook = {
        id: 'bookId',
        isAvailable: true,
        ownerId: 'myId',
      };

      prismaMock.book.findUnique.mockResolvedValue(
        mockBook as unknown as ReturnType<typeof prismaMock.book.findUnique> extends Promise<
          infer U
        >
          ? U
          : never
      );

      const result = await exchangeService.requestExchange('myId', 'bookId');
      expect(result.status).toBe('OWN_BOOK');
    });

    it('should return DUPLICATE if request already exists', async () => {
      const mockBook = {
        id: 'bookId',
        isAvailable: true,
        ownerId: 'ownerId',
      };

      prismaMock.book.findUnique.mockResolvedValue(
        mockBook as unknown as ReturnType<typeof prismaMock.book.findUnique> extends Promise<
          infer U
        >
          ? U
          : never
      );

      prismaMock.exchangeRequest.findFirst.mockResolvedValue(
        {} as unknown as ReturnType<typeof prismaMock.exchangeRequest.findFirst> extends Promise<
          infer U
        >
          ? U
          : never
      );

      const result = await exchangeService.requestExchange('senderId', 'bookId');
      expect(result.status).toBe('DUPLICATE');
    });
  });
});
