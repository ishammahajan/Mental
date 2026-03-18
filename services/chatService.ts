import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as firestoreDb } from './firebaseConfig';
import { P2PMessage } from '../types';
import * as storage from './storage';
import { isDemoMode } from './demoMode';

const CHAT_COLLECTION = 'p2p_messages';

const buildThreadId = (id1: string, id2: string): string =>
  [id1, id2].sort().join('__');

const toIsoTimestamp = (raw: any): string => {
  if (!raw) return new Date().toISOString();
  if (typeof raw === 'string') return raw;
  if (raw?.toDate && typeof raw.toDate === 'function') return raw.toDate().toISOString();
  return new Date(raw).toISOString();
};

const normalize = (id: string, data: any): P2PMessage => ({
  id,
  senderId: data.senderId,
  receiverId: data.receiverId,
  text: data.text,
  timestamp: toIsoTimestamp(data.timestamp ?? data.createdAt),
  isRead: Boolean(data.isRead),
});

export const sendP2PMessage = async (msg: P2PMessage): Promise<void> => {
  if (isDemoMode()) {
    await storage.sendP2PMessage(msg);
    return;
  }
  try {
    await addDoc(collection(firestoreDb, CHAT_COLLECTION), {
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      text: msg.text,
      isRead: msg.isRead,
      threadId: buildThreadId(msg.senderId, msg.receiverId),
      participants: [msg.senderId, msg.receiverId],
      timestamp: msg.timestamp,
      createdAt: serverTimestamp(),
    });
  } catch {
    await storage.sendP2PMessage(msg);
  }
};

export const getP2PThread = async (userId1: string, userId2: string): Promise<P2PMessage[]> => {
  if (isDemoMode()) {
    return storage.getP2PThread(userId1, userId2);
  }
  try {
    const q = query(
      collection(firestoreDb, CHAT_COLLECTION),
      where('threadId', '==', buildThreadId(userId1, userId2)),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => normalize(d.id, d.data()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch {
    return storage.getP2PThread(userId1, userId2);
  }
};

export const getUnreadP2PCount = async (userId: string): Promise<number> => {
  if (isDemoMode()) {
    return storage.getUnreadP2PCount(userId);
  }
  try {
    const q = query(
      collection(firestoreDb, CHAT_COLLECTION),
      where('receiverId', '==', userId),
      where('isRead', '==', false),
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return storage.getUnreadP2PCount(userId);
  }
};

export const markThreadAsRead = async (receiverId: string, senderId: string): Promise<void> => {
  if (isDemoMode()) {
    await storage.markThreadAsRead(receiverId, senderId);
    return;
  }
  try {
    const q = query(
      collection(firestoreDb, CHAT_COLLECTION),
      where('threadId', '==', buildThreadId(receiverId, senderId)),
      where('receiverId', '==', receiverId),
      where('senderId', '==', senderId),
      where('isRead', '==', false),
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((docSnap) => updateDoc(docSnap.ref, { isRead: true })));
  } catch {
    await storage.markThreadAsRead(receiverId, senderId);
  }
};

export const getCounselorConversations = async (counselorId: string) => {
  if (isDemoMode()) {
    return storage.getCounselorConversations(counselorId);
  }
  try {
    const q = query(
      collection(firestoreDb, CHAT_COLLECTION),
      where('participants', 'array-contains', counselorId),
    );
    const snap = await getDocs(q);

    const convos: Record<string, { studentId: string; lastMessage: P2PMessage | null; unreadCount: number }> = {};

    const sortedMessages = snap.docs
      .map((d) => normalize(d.id, d.data()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    sortedMessages.forEach((msg) => {
      const otherId = msg.senderId === counselorId ? msg.receiverId : msg.senderId;
      if (!convos[otherId]) {
        convos[otherId] = { studentId: otherId, lastMessage: msg, unreadCount: 0 };
      }
      if (!convos[otherId].lastMessage) {
        convos[otherId].lastMessage = msg;
      }
      if (msg.receiverId === counselorId && !msg.isRead) {
        convos[otherId].unreadCount += 1;
      }
    });

    return Object.values(convos).sort((a, b) => {
      const ta = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const tb = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return tb - ta;
    });
  } catch {
    return storage.getCounselorConversations(counselorId);
  }
};

export const subscribeToThread = (
  userId1: string,
  userId2: string,
  callback: (messages: P2PMessage[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    const emit = async () => callback(await storage.getP2PThread(userId1, userId2));
    emit();
    const interval = setInterval(emit, 3000);
    return () => clearInterval(interval);
  }
  try {
    const q = query(
      collection(firestoreDb, CHAT_COLLECTION),
      where('threadId', '==', buildThreadId(userId1, userId2)),
    );
    return onSnapshot(q, (snap) => {
      callback(
        snap.docs
          .map((d) => normalize(d.id, d.data()))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      );
    });
  } catch {
    callback([]);
    return () => {};
  }
};


