import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { P2PMessage } from '../types';

interface UseFirebaseChatProps {
  userId: string;
  otherUserId: string;
}

export const useFirebaseChat = ({ userId, otherUserId }: UseFirebaseChatProps) => {
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [remoteTyping, setRemoteTyping] = useState<boolean>(false);

  const normalizeId = (id: string) => id.trim().toLowerCase();
  const makeChatId = (id1: string, id2: string) => [normalizeId(id1), normalizeId(id2)].sort().join('__');
  const chatId = makeChatId(userId, otherUserId);

  const retryQueueKey = `speakup_chat_retry_v2_${chatId}`;

  const getIsoFromUnknownTimestamp = (value: unknown): string => {
    if (value instanceof Timestamp) {
      return value.toDate().toISOString();
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
    }

    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }

    return new Date(0).toISOString();
  };

  const queueFailedSend = (message: P2PMessage) => {
    try {
      const raw = localStorage.getItem(retryQueueKey);
      const queue = raw ? (JSON.parse(raw) as P2PMessage[]) : [];
      queue.push({ ...message, failed: true, pending: false });
      localStorage.setItem(retryQueueKey, JSON.stringify(queue));
    } catch {
      // ignore local queue failures
    }
  };

  const drainRetryQueue = async () => {
    try {
      const raw = localStorage.getItem(retryQueueKey);
      const queue = raw ? (JSON.parse(raw) as P2PMessage[]) : [];
      if (queue.length === 0) return;

      const remaining: P2PMessage[] = [];
      for (const queued of queue) {
        try {
          await addDoc(collection(db, 'p2p_messages'), {
            chatId,
            participants: [normalizeId(userId), normalizeId(otherUserId)],
            senderId: queued.senderId,
            receiverId: queued.receiverId,
            text: queued.text,
            isRead: false,
            clientMessageId: queued.clientMessageId || queued.id,
            createdAt: serverTimestamp(),
            createdAtClient: Date.now(),
          });
        } catch {
          remaining.push(queued);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem(retryQueueKey, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(retryQueueKey);
      }
    } catch {
      // ignore retry failures
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'p2p_messages'),
      where('chatId', '==', chatId)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const msgs: P2PMessage[] = snapshot.docs.map((snap) => {
        const data = snap.data() as Record<string, unknown>;
        const timestamp = getIsoFromUnknownTimestamp(
          data.createdAt ?? data.timestamp ?? data.createdAtClient
        );

        return {
          id: snap.id,
          senderId: String(data.senderId || ''),
          receiverId: String(data.receiverId || ''),
          text: String(data.text || ''),
          timestamp,
          isRead: Boolean(data.isRead),
          clientMessageId: typeof data.clientMessageId === 'string' ? data.clientMessageId : undefined,
          pending: snap.metadata.hasPendingWrites,
          failed: false,
        };
      });

      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(msgs);
    }, (error) => {
      console.error('Firebase snapshot error:', error);
    });

    drainRetryQueue();

    return () => {
      unsubscribe();
    };
  }, [chatId, userId, otherUserId]);

  useEffect(() => {
    const handleOnline = () => {
      void drainRetryQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [chatId, userId, otherUserId]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const clientMessageId = `${normalizeId(userId)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      await addDoc(collection(db, 'p2p_messages'), {
        chatId,
        participants: [normalizeId(userId), normalizeId(otherUserId)],
        senderId: userId,
        receiverId: otherUserId,
        text: trimmed,
        isRead: false,
        clientMessageId,
        createdAt: serverTimestamp(),
        createdAtClient: Date.now(),
      });
    } catch (error) {
      console.error('Error sending message: ', error);

      const failedMessage: P2PMessage = {
        id: clientMessageId,
        senderId: userId,
        receiverId: otherUserId,
        text: trimmed,
        timestamp: new Date().toISOString(),
        isRead: false,
        clientMessageId,
        pending: false,
        failed: true,
      };

      setMessages((prev) => [...prev, failedMessage]);
      queueFailedSend(failedMessage);
    }
  };

  const notifyTyping = () => {
    // Typing indicator skipped for Firestore to prevent quota exhaustion 
  };

  return { messages, remoteTyping, sendMessage, notifyTyping };
};
