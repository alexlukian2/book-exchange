import { requireAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth || !req.auth.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};

// Use this middleware to ensure the user exists in our DB and is an admin
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = (req as Request & { auth?: { userId?: string } }).auth; // In Clerk, req.auth contains the user's ID
    if (!auth || !auth.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    next();
  } catch (_error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
