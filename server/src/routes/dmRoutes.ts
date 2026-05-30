import { Router } from 'express';
import {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
  markConversationRead,
} from '../controllers/dmController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// All DM routes require authentication
router.use(requireAuth);

// GET  /api/dm/conversations                          — list all conversations for auth user
router.get('/conversations', getConversations);

// POST /api/dm/conversations                          — create or get existing conversation
router.post('/conversations', createOrGetConversation);

// GET  /api/dm/conversations/:conversationId/messages — get messages in a conversation
router.get('/conversations/:conversationId/messages', getMessages);

// POST /api/dm/conversations/:conversationId/messages — send a new message
router.post('/conversations/:conversationId/messages', sendMessage);

// PATCH /api/dm/conversations/:conversationId/read    — mark messages as read
router.patch('/conversations/:conversationId/read', markConversationRead);

export default router;
