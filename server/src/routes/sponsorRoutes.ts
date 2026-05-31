import { Router } from 'express';
import { getSponsorAddress, sponsorTransaction } from '../controllers/sponsorController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// GET /api/sponsor/address - Get the active sponsor wallet address and SUI balance
router.get('/address', getSponsorAddress);

// POST /api/sponsor - Build and sign sponsored transaction block bytes
router.post('/', requireAuth, sponsorTransaction);

export default router;
