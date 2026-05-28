import { describe, it, expect } from '@jest/globals';
import { prismaMock } from '../../utils/__mocks__/prisma';
import * as userService from '../user.service';
import { Role } from '@prisma/client';

describe('User Service', () => {
  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.USER,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(
        mockUser as unknown as ReturnType<typeof prismaMock.user.findUnique> extends Promise<
          infer U
        >
          ? U
          : never
      );

      const result = await userService.getUserById('1');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await userService.getUserById('missing');
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should successfully create a user', async () => {
      const input = {
        id: 'user_123',
        email: 'new@example.com',
        name: 'New User',
        avatarUrl: 'http://image.com/1',
      };

      const mockCreated = {
        ...input,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.create.mockResolvedValue(
        mockCreated as unknown as ReturnType<typeof prismaMock.user.create> extends Promise<infer U>
          ? U
          : never
      );

      const result = await userService.createUser(input);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          id: input.id,
          email: input.email,
          name: input.name,
          avatarUrl: input.avatarUrl,
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });
});
