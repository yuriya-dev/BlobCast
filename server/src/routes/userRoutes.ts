import { Router } from 'express';
import { getUserProfile, upsertUserProfile, getAllUsers } from '../controllers/userController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// GET /api/users - Get all registered users
router.get('/', getAllUsers);

// GET /api/users/:walletAddress - Get profile details by SUI address
router.get('/:walletAddress', getUserProfile);

// POST /api/users - Register or update profile identities
router.post('/', requireAuth, upsertUserProfile);

export default router;
