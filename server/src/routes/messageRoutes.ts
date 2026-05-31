import { Router } from 'express';
import { 
    getConversations, 
    getMessagesWithUser, 
    sendMessage 
} from '../controllers/messageController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware globally to all messaging routes
router.use(requireAuth);

// GET /api/messages/conversations - Get conversations list for authenticated user
router.get('/conversations', getConversations);

// GET /api/messages/:otherUserId - Get messages history with a user
router.get('/:otherUserId', getMessagesWithUser);

// POST /api/messages - Send a message to a user
router.post('/', sendMessage);

export default router;
