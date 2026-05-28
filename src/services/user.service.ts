import { prisma } from '../utils/prisma';

/**
 * Create a new user from Clerk webhook data.
 */
export async function createUser(data: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}) {
  return prisma.user.create({
    data: {
      id: data.id,
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl,
    },
  });
}

/**
 * Update an existing user's profile (synced from Clerk).
 */
export async function updateUser(
  id: string,
  data: { email?: string; name?: string; avatarUrl?: string | null }
) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

/**
 * Delete a user and all associated data (cascaded via Prisma schema).
 */
export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
  });
}

/**
 * Get user by ID.
 */
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Get all users with pagination (admin).
 */
export async function getAllUsers(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return { users, total };
}

/**
 * Update user role (admin).
 */
export async function updateUserRole(id: string, role: 'USER' | 'ADMIN') {
  return prisma.user.update({
    where: { id },
    data: { role },
  });
}
