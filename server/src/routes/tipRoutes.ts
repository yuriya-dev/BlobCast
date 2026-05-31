import { Router } from 'express';
import { createTip, getTipsReceived } from '../controllers/tipController';

const router = Router();

// POST /api/tips - Register a new verified tip transaction
router.post('/', createTip);

// GET /api/tips - Get all tip records received by a user (recipientId query)
router.get('/', getTipsReceived);

export default router;
