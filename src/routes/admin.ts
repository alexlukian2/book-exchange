import { Router } from 'express';
import { getAllUsers, updateUserRole, deleteUser } from '../controllers/admin';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

// Всі адмін-маршрути вимагають авторизації та ролі ADMIN
router.use(authenticate, requireAdmin);

router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

export default router;
