import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';

/**
 * Controller to fetch all conversations (partners) of the authenticated user
 * GET /api/messages/conversations
 */
export const getConversations = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;

    const conversations = await prisma.conversation.findMany({
        where: {
            OR: [
                { participant1Id: userId },
                { participant2Id: userId }
            ]
        },
        orderBy: { lastMessageAt: 'desc' },
        include: {
            participant1: true,
            participant2: true,
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    const formattedConvs = await Promise.all(conversations.map(async (conv) => {
        const otherUser = conv.participant1Id === userId ? conv.participant2 : conv.participant1;
        const lastMessage = conv.messages[0] ? conv.messages[0].text : 'Started a new sealed chat session.';
        const lastTimeRaw = conv.messages[0] ? conv.messages[0].createdAt : conv.createdAt;
        
        // Format time dynamically: e.g. "2m ago", "1h ago", "Yesterday" or date
        const diffMs = Date.now() - new Date(lastTimeRaw).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 600);
        let lastTime = 'Just now';
        
        if (diffMins > 0 && diffMins < 60) {
            lastTime = `${diffMins}m ago`;
        } else if (diffHours > 0 && diffHours < 24) {
            lastTime = `${diffHours}h ago`;
        } else if (diffHours >= 24) {
            lastTime = new Date(lastTimeRaw).toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        const unread = await prisma.directMessage.count({
            where: {
                conversationId: conv.id,
                isRead: false,
                senderId: otherUser.id
            }
        });

        return {
            id: conv.id,
            user: {
                id: otherUser.id,
                displayName: otherUser.displayName || 'Anonymous Caster',
                username: otherUser.username || 'anonymous',
                avatarBlobId: otherUser.avatarBlobId,
                verified: otherUser.verified,
                online: true, // Mock online status as true for UX completeness
                walletAddress: otherUser.walletAddress
            },
            lastMessage,
            lastTime,
            unread
        };
    }));

    res.status(200).json({
        status: 'success',
        data: { conversations: formattedConvs }
    });
});

/**
 * Controller to fetch all messages in a conversation with a specific user
 * GET /api/messages/:otherUserId
 */
export const getMessagesWithUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.authUser!.id;
    const { otherUserId } = req.params;

    if (!otherUserId) {
        throw new AppError('otherUserId parameter is required', 400);
    }

    const conv = await prisma.conversation.findFirst({
        where: {
            OR: [
                { participant1Id: userId, participant2Id: otherUserId },
                { participant1Id: otherUserId, participant2Id: userId }
            ]
        }
    });

    if (!conv) {
        return res.status(200).json({
            status: 'success',
            data: { messages: [] }
        });
    }

    // Mark incoming messages as read
    await prisma.directMessage.updateMany({
        where: {
            conversationId: conv.id,
            isRead: false,
            senderId: otherUserId
        },
        data: { isRead: true }
    });

    const messages = await prisma.directMessage.findMany({
        where: { conversationId: conv.id },
        orderBy: { createdAt: 'asc' }
    });

    const formattedMessages = messages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        text: msg.text,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        walrusBlobId: msg.walrusBlobId || undefined
    }));

    res.status(200).json({
        status: 'success',
        data: { messages: formattedMessages }
    });
});

/**
 * Controller to send a direct message to a user
 * POST /api/messages
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const senderId = req.authUser!.id;
    const { receiverId, text, walrusBlobId } = req.body;

    if (!receiverId || !text) {
        throw new AppError('receiverId and text are required', 400);
    }

    // Alphabetic ordering of IDs to strictly satisfy the compound UNIQUE constraint on conversation pairs
    const [p1Id, p2Id] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

    let conv = await prisma.conversation.findUnique({
        where: {
            participant1Id_participant2Id: {
                participant1Id: p1Id,
                participant2Id: p2Id
            }
        }
    });

    if (!conv) {
        conv = await prisma.conversation.create({
            data: {
                participant1Id: p1Id,
                participant2Id: p2Id,
                lastMessageAt: new Date()
            }
        });
    } else {
        await prisma.conversation.update({
            where: { id: conv.id },
            data: { lastMessageAt: new Date() }
        });
    }

    const message = await prisma.directMessage.create({
        data: {
            conversationId: conv.id,
            senderId,
            text,
            walrusBlobId: walrusBlobId || null
        }
    });

    // Create DM Notification
    try {
        await prisma.notification.create({
            data: {
                userId: receiverId,
                actorId: senderId,
                type: 'dm'
            }
        });
    } catch (notifErr) {
        console.error('⚠️ Failed to create DM notification:', notifErr);
    }

    const formattedMessage = {
        id: message.id,
        senderId: message.senderId,
        text: message.text,
        time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        walrusBlobId: message.walrusBlobId || undefined
    };

    res.status(201).json({
        status: 'success',
        data: { message: formattedMessage }
    });
});
