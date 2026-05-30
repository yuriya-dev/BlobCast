import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { broadcastToConversation } from '../lib/websocket';

const participantSelect = {
  id: true,
  walletAddress: true,
  username: true,
  displayName: true,
  avatarBlobId: true,
  verified: true,
};

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  text: true,
  walrusBlobId: true,
  isRead: true,
  createdAt: true,
  sender: { select: participantSelect },
};

/**
 * GET /api/dm/conversations
 * Returns all conversations for the authenticated user, ordered by most recent activity.
 */
export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const sessionUser = req.authUser;
  if (!sessionUser) throw new AppError('Authentication required', 401);

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { participant1Id: sessionUser.id },
        { participant2Id: sessionUser.id },
      ],
    },
    include: {
      participant1: { select: participantSelect },
      participant2: { select: participantSelect },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          senderId: true,
          text: true,
          createdAt: true,
          isRead: true,
        },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  // Add unread count for current user
  const result = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await prisma.directMessage.count({
        where: {
          conversationId: conv.id,
          isRead: false,
          senderId: { not: sessionUser.id }, // messages FROM the other user that I haven't read
        },
      });

      const otherUser =
        conv.participant1Id === sessionUser.id ? conv.participant1 : conv.participant2;

      return {
        id: conv.id,
        suiObjectId: conv.suiObjectId,
        otherUser,
        lastMessage: conv.messages[0] || null,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        unreadCount,
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: { conversations: result },
  });
});

/**
 * POST /api/dm/conversations
 * Creates or returns an existing conversation between the authenticated user and recipient.
 * Body: { recipientId: string }
 */
export const createOrGetConversation = asyncHandler(async (req: Request, res: Response) => {
  const sessionUser = req.authUser;
  if (!sessionUser) throw new AppError('Authentication required', 401);

  const { recipientId, suiObjectId } = req.body;
  if (!recipientId) throw new AppError('recipientId is required', 400);
  if (recipientId === sessionUser.id) throw new AppError('Cannot create a conversation with yourself', 400);

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: participantSelect,
  });
  if (!recipient) throw new AppError('Recipient user not found', 404);

  // Normalize participant order so unique constraint is stable (lower ID first)
  const [p1Id, p2Id] = [sessionUser.id, recipientId].sort();

  const conversation = await prisma.conversation.upsert({
    where: {
      participant1Id_participant2Id: {
        participant1Id: p1Id,
        participant2Id: p2Id,
      },
    },
    update: suiObjectId ? { suiObjectId } : {},
    create: {
      participant1Id: p1Id,
      participant2Id: p2Id,
      suiObjectId: suiObjectId || null,
    },
    include: {
      participant1: { select: participantSelect },
      participant2: { select: participantSelect },
    },
  });

  const otherUser =
    conversation.participant1Id === sessionUser.id
      ? conversation.participant2
      : conversation.participant1;

  res.status(200).json({
    status: 'success',
    data: {
      conversation: {
        id: conversation.id,
        suiObjectId: conversation.suiObjectId,
        otherUser,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
      },
    },
  });
});

/**
 * GET /api/dm/conversations/:conversationId/messages
 * Returns paginated messages in a conversation.
 * Query: ?page=1&limit=50
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const sessionUser = req.authUser;
  if (!sessionUser) throw new AppError('Authentication required', 401);

  const { conversationId } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip = (page - 1) * limit;

  // Verify user is a participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) throw new AppError('Conversation not found', 404);

  if (
    conversation.participant1Id !== sessionUser.id &&
    conversation.participant2Id !== sessionUser.id
  ) {
    throw new AppError('Access denied to this conversation', 403);
  }

  const messages = await prisma.directMessage.findMany({
    where: { conversationId },
    select: messageSelect,
    orderBy: { createdAt: 'asc' },
    skip,
    take: limit,
  });

  const total = await prisma.directMessage.count({ where: { conversationId } });

  res.status(200).json({
    status: 'success',
    data: { messages },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * POST /api/dm/conversations/:conversationId/messages
 * Sends a new direct message in the conversation.
 * Body: { text: string, walrusBlobId?: string }
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const sessionUser = req.authUser;
  if (!sessionUser) throw new AppError('Authentication required', 401);

  const { conversationId } = req.params;
  const { text, walrusBlobId } = req.body;

  if (!text || !text.trim()) throw new AppError('Message text is required', 400);

  // Verify user is a participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) throw new AppError('Conversation not found', 404);

  if (
    conversation.participant1Id !== sessionUser.id &&
    conversation.participant2Id !== sessionUser.id
  ) {
    throw new AppError('Access denied to this conversation', 403);
  }

  const now = new Date();

  // Create message and update lastMessageAt atomically
  const [message] = await prisma.$transaction([
    prisma.directMessage.create({
      data: {
        conversationId,
        senderId: sessionUser.id,
        text: text.trim(),
        walrusBlobId: walrusBlobId || null,
        isRead: false,
        createdAt: now,
      },
      select: messageSelect,
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    }),
  ]);

  // Broadcast new message to all subscribers of this conversation via WebSocket
  broadcastToConversation(conversationId, {
    type: 'new_message',
    conversationId,
    message,
  });

  res.status(201).json({
    status: 'success',
    data: { message },
  });
});

/**
 * PATCH /api/dm/conversations/:conversationId/read
 * Marks all messages in a conversation sent by the OTHER user as read.
 */
export const markConversationRead = asyncHandler(async (req: Request, res: Response) => {
  const sessionUser = req.authUser;
  if (!sessionUser) throw new AppError('Authentication required', 401);

  const { conversationId } = req.params;

  // Verify user is a participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) throw new AppError('Conversation not found', 404);

  if (
    conversation.participant1Id !== sessionUser.id &&
    conversation.participant2Id !== sessionUser.id
  ) {
    throw new AppError('Access denied to this conversation', 403);
  }

  await prisma.directMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: sessionUser.id },
      isRead: false,
    },
    data: { isRead: true },
  });

  res.status(200).json({
    status: 'success',
    message: 'Messages marked as read',
  });
});
