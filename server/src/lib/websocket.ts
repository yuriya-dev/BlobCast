import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { verifyAuthToken, parseCookies, AUTH_COOKIE_NAME } from './auth';
import { prisma } from './db';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  conversationIds?: Set<string>;
  isAlive?: boolean;
}

type WSMessage = {
  type: 'join_conversation' | 'leave_conversation' | 'ping';
  conversationId?: string;
};

type WSBroadcast = {
  type: 'new_message' | 'conversation_update' | 'pong' | 'error';
  conversationId?: string;
  message?: any;
  error?: string;
};

// Map of userId → set of connected sockets (a user can have multiple tabs open)
const userSockets = new Map<string, Set<AuthenticatedSocket>>();

// Map of conversationId → set of connected userIds
const conversationSubscriptions = new Map<string, Set<string>>();

function addUserSocket(userId: string, socket: AuthenticatedSocket) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socket);
}

function removeUserSocket(userId: string, socket: AuthenticatedSocket) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socket);
    if (sockets.size === 0) {
      userSockets.delete(userId);
    }
  }

  // Clean up conversation subscriptions
  if (socket.conversationIds) {
    for (const convId of socket.conversationIds) {
      const subscribers = conversationSubscriptions.get(convId);
      if (subscribers) {
        subscribers.delete(userId);
        if (subscribers.size === 0) {
          conversationSubscriptions.delete(convId);
        }
      }
    }
  }
}

export function broadcastToConversation(conversationId: string, payload: WSBroadcast) {
  const subscribers = conversationSubscriptions.get(conversationId);
  if (!subscribers) return;

  const data = JSON.stringify(payload);

  for (const userId of subscribers) {
    const sockets = userSockets.get(userId);
    if (!sockets) continue;

    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }
}

export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Heartbeat interval to prune dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((rawSocket) => {
      const socket = rawSocket as AuthenticatedSocket;
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  wss.on('connection', async (rawSocket: WebSocket, req: IncomingMessage) => {
    const socket = rawSocket as AuthenticatedSocket;
    socket.isAlive = true;
    socket.conversationIds = new Set();

    // Authenticate via cookie header
    const cookieHeader = req.headers.cookie || '';
    const cookies = parseCookies(cookieHeader);
    const token = cookies[AUTH_COOKIE_NAME] ? decodeURIComponent(cookies[AUTH_COOKIE_NAME]) : null;
    const payload = verifyAuthToken(token);

    if (!payload) {
      socket.send(JSON.stringify({ type: 'error', error: 'Authentication required' } as WSBroadcast));
      socket.close(4001, 'Unauthorized');
      return;
    }

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      socket.send(JSON.stringify({ type: 'error', error: 'User not found' } as WSBroadcast));
      socket.close(4001, 'User not found');
      return;
    }

    socket.userId = user.id;
    addUserSocket(user.id, socket);
    console.log(`🔌 [WS] User ${user.username || user.id} connected`);

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', async (rawData) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(rawData.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' } as WSBroadcast));
          break;

        case 'join_conversation': {
          if (!msg.conversationId) break;

          // Verify user is participant in this conversation
          const conv = await prisma.conversation.findUnique({
            where: { id: msg.conversationId },
          });

          if (
            !conv ||
            (conv.participant1Id !== socket.userId && conv.participant2Id !== socket.userId)
          ) {
            socket.send(JSON.stringify({ type: 'error', error: 'Access denied to conversation' } as WSBroadcast));
            break;
          }

          socket.conversationIds!.add(msg.conversationId);

          if (!conversationSubscriptions.has(msg.conversationId)) {
            conversationSubscriptions.set(msg.conversationId, new Set());
          }
          conversationSubscriptions.get(msg.conversationId)!.add(socket.userId!);
          console.log(`🔌 [WS] User ${socket.userId} joined conversation ${msg.conversationId}`);
          break;
        }

        case 'leave_conversation': {
          if (!msg.conversationId) break;
          socket.conversationIds!.delete(msg.conversationId);

          const subscribers = conversationSubscriptions.get(msg.conversationId);
          if (subscribers) {
            // Only remove if user has no other sockets subscribed to this conversation
            const userSocketsForConv = userSockets.get(socket.userId!);
            const anyOtherSocketSubscribed = userSocketsForConv
              ? [...userSocketsForConv].some(
                  (s) => s !== socket && s.conversationIds?.has(msg.conversationId!)
                )
              : false;

            if (!anyOtherSocketSubscribed) {
              subscribers.delete(socket.userId!);
              if (subscribers.size === 0) {
                conversationSubscriptions.delete(msg.conversationId);
              }
            }
          }
          break;
        }
      }
    });

    socket.on('close', () => {
      if (socket.userId) {
        removeUserSocket(socket.userId, socket);
        console.log(`🔌 [WS] User ${socket.userId} disconnected`);
      }
    });

    socket.on('error', (err) => {
      console.error(`🔌 [WS] Socket error for user ${socket.userId}:`, err.message);
    });
  });

  console.log('🔌 [WS] WebSocket server initialized at /ws');
  return wss;
}
