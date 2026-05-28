import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { updateRoleSchema } from '../schemas/admin';
import { paginationSchema } from '../schemas/book';

// GET /admin/users — paginated
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const query = paginationSchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: query.error.format() });
      return;
    }

    const { page, limit } = query.data;
    const { users, total } = await userService.getAllUsers(page, limit);

    res.json({
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /admin/users/:id/role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const parseResult = updateRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid role', details: parseResult.error.format() });
      return;
    }

    const updatedUser = await userService.updateUserRole(
      req.params.id as string,
      parseResult.data.role
    );

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /admin/users/:id
export const deleteUser = async (req: Request, res: Response) => {
  try {
    // TODO(security): Also delete user from Clerk via Clerk API
    // to prevent re-creation via webhook on next login.
    // Requires: @clerk/backend SDK → clerkClient.users.deleteUser(id)
    await userService.deleteUser(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
