import { Router } from 'express';
import { getUserProfile, upsertUserProfile } from '../controllers/userController';

const router = Router();

// GET /api/users/:walletAddress - Get profile details by SUI address
router.get('/:walletAddress', getUserProfile);

// POST /api/users - Register or update profile identities
router.post('/', upsertUserProfile);

export default router;
