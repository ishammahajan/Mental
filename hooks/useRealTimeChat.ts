/**
 * Real-Time Chat Hook with WebSocket support
 * Falls back to polling if WebSocket unavailable
 * Implements typing indicators and read receipts
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { P2PMessage } from '../types';
import * as chatService from '../services/chatService';

export interface UseRealTimeChatOptions {
  userId: string;
  otherUserId: string;
  pollIntervalMs?: number;
  wsUrl?: string;
  autoMarkRead?: boolean;
}

export interface UseRealTimeChatResult {
  messages: P2PMessage[];
  remoteTyping: boolean;
  sendMessage: (text: string) => Promise<void>;
  notifyTyping: () => void;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook for real-time P2P chat with WebSocket fallback to polling
 */
export function useRealTimeChat({
  userId,
  otherUserId,
  pollIntervalMs = 2000,
  wsUrl = 'ws://localhost:3002',
  autoMarkRead = true
}: UseRealTimeChatOptions): UseRealTimeChatResult {
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // ─── WebSocket Connection ──────────────────────────────────────────
  useEffect(() => {
    let useFallback = false;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        let connected = false;

        ws.onopen = () => {
          connected = true;
          setIsConnected(true);
          setError(null);

          // Send initialization message
          ws.send(
            JSON.stringify({
              type: 'INIT',
              userId,
              otherUserId
            })
          );

          // Request message history
          ws.send(
            JSON.stringify({
              type: 'REQUEST_HISTORY',
              userId,
              otherUserId
            })
          );

          console.log('[RealTimeChat] WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'MESSAGE_HISTORY':
                setMessages(data.messages || []);
                lastMessageIdRef.current = data.messages?.[data.messages.length - 1]?.id;
                break;

              case 'NEW_MESSAGE':
                setMessages(prev => [...prev, data.message]);
                lastMessageIdRef.current = data.message.id;

                // Auto-mark as read if enabled
                if (autoMarkRead && data.message.senderId !== userId && !data.message.isRead) {
                  chatService.markThreadAsRead(userId, data.message.senderId);
                }
                break;

              case 'USER_TYPING':
                setRemoteTyping(true);
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  setRemoteTyping(false);
                }, 3000);
                break;

              case 'ERROR':
                console.error('[RealTimeChat] Server error:', data.message);
                setError(data.message);
                break;
            }
          } catch (err) {
            console.error('[RealTimeChat] Failed to parse message:', err);
          }
        };

        ws.onerror = (event) => {
          console.warn('[RealTimeChat] WebSocket error:', event);
          if (!connected) {
            setError('Failed to connect to real-time server');
            useFallback = true;
            setTimeout(connectWebSocket, 3000); // Retry
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log('[RealTimeChat] WebSocket closed');

          // Don't reconnect if we're switching to polling
          if (!useFallback) {
            setTimeout(connectWebSocket, 5000);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        console.warn('[RealTimeChat] WebSocket unavailable, using polling fallback');
        setError(null); // Not an error - this is expected
        useFallback = true;
        setIsConnected(false);
      }
    };

    // ─── Polling Fallback ──────────────────────────────────────────
    const startPolling = () => {
      const poll = async () => {
        try {
          const freshMessages = await chatService.getP2PThread(userId, otherUserId);

          // Only update if messages changed
          if (freshMessages.length > 0) {
            const lastLocalId = lastMessageIdRef.current;
            const newMessages = freshMessages.filter(
              m => !lastLocalId || new Date(m.timestamp) > new Date(lastMessageIdRef.current || 0)
            );

            if (newMessages.length > 0) {
              setMessages(freshMessages);
              lastMessageIdRef.current = freshMessages[freshMessages.length - 1].id;

              // Auto-mark as read
              if (autoMarkRead) {
                newMessages.forEach(m => {
                  if (m.receiverId === userId && !m.isRead) {
                    chatService.markThreadAsRead(userId, m.senderId);
                  }
                });
              }
            }
          }
        } catch (err) {
          console.error('[RealTimeChat] Polling error:', err);
        }
      };

      // Initial load
      poll();

      // Set up polling interval
      pollTimerRef.current = setInterval(poll, pollIntervalMs);
    };

    // Try WebSocket first, fall back to polling after 3 seconds
    connectWebSocket();

    const fallbackTimer = setTimeout(() => {
      if (!isConnected && !pollingStartedRef.current) {
        console.log('[RealTimeChat] WebSocket failed, using polling');
        startPolling();
        pollingStartedRef.current = true;
      }
    }, 3000);

    const pollingStartedRef = useRef(false);

    return () => {
      clearTimeout(fallbackTimer);

      if (wsRef.current) {
        wsRef.current.close();
      }

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [userId, otherUserId, wsUrl, autoMarkRead, pollIntervalMs]);

  // ─── Send Message ─────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const msg: P2PMessage = {
        id: Date.now().toString(),
        senderId: userId,
        receiverId: otherUserId,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        isRead: true
      };

      // Send via WebSocket if connected, otherwise via service
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'SEND_MESSAGE',
            message: msg
          })
        );
      } else {
        await chatService.sendP2PMessage(msg);
        setMessages(prev => [...prev, msg]);
      }

      lastMessageIdRef.current = msg.id;
    },
    [userId, otherUserId]
  );

  // ─── Notify Typing ────────────────────────────────────────────────
  const notifyTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'TYPING',
          userId,
          otherUserId
        })
      );
    }
  }, [userId, otherUserId]);

  return {
    messages,
    remoteTyping,
    sendMessage,
    notifyTyping,
    isConnected,
    error
  };
}

/**
 * Simplified hook for one-way message retrieval (read-only)
 */
export function useRealTimeMessages(
  userId: string,
  otherUserId: string,
  pollIntervalMs: number = 2000
) {
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const msgs = await chatService.getP2PThread(userId, otherUserId);
        setMessages(msgs);
      } catch (error) {
        console.error('[RealTimeMessages] Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
    pollTimerRef.current = setInterval(loadMessages, pollIntervalMs);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [userId, otherUserId, pollIntervalMs]);

  return { messages, isLoading };
}


