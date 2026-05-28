import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// GET /admin/users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);

    res.json({
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /admin/users/:id/role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'USER' або 'ADMIN'

    if (role !== 'USER' && role !== 'ADMIN') {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /admin/users/:id
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // В Clerk також потрібно було б видалити юзера через Clerk API,
    // але для MVP видаляємо лише з нашої бази
    await prisma.user.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
