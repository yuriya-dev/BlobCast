'use client';

import { useEffect, useRef, useCallback } from 'react';

const getWsUrl = (): string => {
  if (typeof window === 'undefined') return 'ws://localhost:8080/ws';

  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  try {
    const url = new URL(apiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}/ws`;
  } catch (e) {
    return 'ws://localhost:8080/ws';
  }
};

const WS_URL = getWsUrl();

type WSMessageType = 'new_message' | 'conversation_update' | 'pong' | 'error';

export interface WSMessage {
  type: WSMessageType;
  conversationId?: string;
  message?: any;
  error?: string;
}

interface UseDMWebSocketOptions {
  conversationId: string | null;
  onNewMessage: (message: any) => void;
  enabled?: boolean;
}

/**
 * Hook to connect to the BlobCast DM WebSocket server.
 * Subscribes to a specific conversation and calls onNewMessage when a new message arrives.
 * Handles reconnection with exponential backoff.
 */
export function useDMWebSocket({
  conversationId,
  onNewMessage,
  enabled = true,
}: UseDMWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const activeConvIdRef = useRef<string | null>(null);
  const isUnmountedRef = useRef(false);

  // Sync volatile props to refs to avoid infinite loops and keep callback references static
  const onNewMessageRef = useRef(onNewMessage);
  const conversationIdRef = useRef(conversationId);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabledRef.current || typeof window === 'undefined') return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        console.log('🔌 [WS Client] Connected to BlobCast WS server');

        // Re-subscribe to current conversation after reconnect
        if (activeConvIdRef.current) {
          sendMessage({ type: 'join_conversation', conversationId: activeConvIdRef.current });
        } else if (conversationIdRef.current) {
          sendMessage({ type: 'join_conversation', conversationId: conversationIdRef.current });
          activeConvIdRef.current = conversationIdRef.current;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);

          if (data.type === 'new_message' && data.conversationId === conversationIdRef.current && data.message) {
            onNewMessageRef.current(data.message);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = (event) => {
        if (isUnmountedRef.current) return;
        console.log(`🔌 [WS Client] Disconnected (code: ${event.code}). Reconnecting...`);

        // Don't reconnect on auth failure
        if (event.code === 4001) return;

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) connect();
        }, delay);
      };

      ws.onerror = (err) => {
        console.warn('🔌 [WS Client] WebSocket error:', err);
      };
    } catch (err) {
      console.warn('🔌 [WS Client] Failed to create WebSocket:', err);
    }
  }, [sendMessage]);

  // Connect on mount
  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [connect]);

  // Subscribe to new conversation when it changes without reconnecting
  useEffect(() => {
    if (!conversationId) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Leave old conversation
      if (activeConvIdRef.current && activeConvIdRef.current !== conversationId) {
        sendMessage({ type: 'leave_conversation', conversationId: activeConvIdRef.current });
      }
      sendMessage({ type: 'join_conversation', conversationId: conversationId });
      activeConvIdRef.current = conversationId;
    } else {
      activeConvIdRef.current = conversationId;
    }
  }, [conversationId, sendMessage]);
}
