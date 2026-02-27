import { User, Role, Message, AppointmentSlot, WellnessTask, WellnessLeave, JournalEntry, P2PMessage, ConsentData } from '../types';
import { encryptData, decryptData } from '../utils/encryption';
import { MOCK_SLOTS } from '../constants';

const CLOUD_KEYS = {
  USERS: 'speakup_cloud_users',
  CHATS: 'speakup_cloud_chats',
  TASKS: 'speakup_cloud_tasks',

  SLOTS: 'speakup_cloud_slots',
  JOURNALS: 'speakup_cloud_journals',
  CONSENTS: 'speakup_cloud_consents',
  P2P_MSGS: 'speakup_cloud_p2p_msgs'
};

// --- Cloud Simulation Helpers ---

// Simulate network latency (200-500ms)
const networkDelay = () => new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

const cloudGet = <T>(key: string, defaultVal: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
};

// --- Realtime Sync via BroadcastChannel ---
// BroadcastChannel fires in ALL tabs including the one that wrote — unlike the storage event.
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('speakup_sync') : null;

const cloudSet = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
  // Broadcast to all tabs (including self) so UIs update instantly
  syncChannel?.postMessage({ key });
};


// --- Auth ---
export const getUser = async (userId: string): Promise<User | null> => {
  await networkDelay();
  const users = cloudGet<User[]>(CLOUD_KEYS.USERS, []);
  return users.find(u => u.id === userId) || null;
};

export const updateUser = async (userId: string, updatedDetails: Partial<User>) => {
  await networkDelay();
  const users = cloudGet<User[]>(CLOUD_KEYS.USERS, []);
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...updatedDetails };
    cloudSet(CLOUD_KEYS.USERS, users);
  }
};

const generateCasefileId = () => {
  const prefix = 'SPJ';
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const getAllUsers = async (): Promise<User[]> => {
  await networkDelay();
  return cloudGet<User[]>(CLOUD_KEYS.USERS, []);
};

export const loginOrRegisterUser = async (email: string, role: Role): Promise<User> => {
  await networkDelay();
  const users = cloudGet<User[]>(CLOUD_KEYS.USERS, []);
  let user = users.find(u => u.email === email);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      casefileId: generateCasefileId(),
      name: email.split('@')[0].replace('.', ' '),
      email,
      role,
      program: role === 'student' ? email.split('.')[0] : undefined
    };
    users.push(user);
    cloudSet(CLOUD_KEYS.USERS, users);
  }
  return user;
};

// --- AI Chat History ---
export const saveChatMessage = async (userId: string, message: Message) => {
  // No delay for save to make UI snappy, assuming optimistic UI updates
  const allChats = cloudGet<Record<string, Message[]>>(CLOUD_KEYS.CHATS, {});
  const userChats = allChats[userId] || [];

  // Encrypt payload before "sending to cloud"
  const payload = { ...message, text: encryptData(message.text) };

  userChats.push(payload);
  allChats[userId] = userChats;
  cloudSet(CLOUD_KEYS.CHATS, allChats);
};

export const getChatHistory = async (userId: string): Promise<Message[]> => {
  await networkDelay();
  const allChats = cloudGet<Record<string, Message[]>>(CLOUD_KEYS.CHATS, {});
  const userChats = allChats[userId] || [];
  // Decrypt on retrieval
  return userChats.map(msg => ({
    ...msg,
    text: decryptData(msg.text),
    // Fix date objects lost during JSON stringify
    timestamp: new Date(msg.timestamp)
  }));
};

/** Clears only the SParsh AI chat history for a user on logout.
 *  Does NOT touch P2P messages between students and counselors. */
export const clearSParshHistory = (userId: string): void => {
  const allChats = cloudGet<Record<string, Message[]>>(CLOUD_KEYS.CHATS, {});
  delete allChats[userId];
  cloudSet(CLOUD_KEYS.CHATS, allChats);
};

// --- P2P Messaging (Encrypted) ---
export const sendP2PMessage = async (msg: P2PMessage) => {
  await networkDelay();
  const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
  const encrypted = { ...msg, text: encryptData(msg.text) };
  allMsgs.push(encrypted);
  cloudSet(CLOUD_KEYS.P2P_MSGS, allMsgs);
};

export const getP2PThread = async (userId1: string, userId2: string): Promise<P2PMessage[]> => {
  // Shorter delay for polling
  const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
  const thread = allMsgs.filter(m =>
    (m.senderId === userId1 && m.receiverId === userId2) ||
    (m.senderId === userId2 && m.receiverId === userId1)
  );
  return thread.map(m => ({ ...m, text: decryptData(m.text) })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getCounselorConversations = async (counselorId: string) => {
  const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
  const convos: Record<string, { studentId: string, lastMessage: P2PMessage | null, unreadCount: number }> = {};

  allMsgs.forEach(msg => {
    if (msg.senderId === counselorId || msg.receiverId === counselorId) {
      const otherId = msg.senderId === counselorId ? msg.receiverId : msg.senderId;

      if (!convos[otherId]) {
        convos[otherId] = { studentId: otherId, lastMessage: null, unreadCount: 0 };
      }

      const currentLast = convos[otherId].lastMessage;
      if (!currentLast || new Date(msg.timestamp) > new Date(currentLast.timestamp)) {
        convos[otherId].lastMessage = { ...msg, text: decryptData(msg.text) };
      }

      if (msg.receiverId === counselorId && !msg.isRead) {
        convos[otherId].unreadCount++;
      }
    }
  });

  return Object.values(convos).sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const tb = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return tb - ta;
  });
};

export const markThreadAsRead = async (receiverId: string, senderId: string) => {
  const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
  let changed = false;
  const updated = allMsgs.map(m => {
    if (m.receiverId === receiverId && m.senderId === senderId && !m.isRead) {
      changed = true;
      return { ...m, isRead: true };
    }
    return m;
  });
  if (changed) cloudSet(CLOUD_KEYS.P2P_MSGS, updated);
}

export const getUnreadP2PCount = async (userId: string): Promise<number> => {
  const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
  return allMsgs.filter(m => m.receiverId === userId && !m.isRead).length;
};

// --- Appointments & Approval Workflow ---
// Slot Booking
export const getSlots = async (): Promise<AppointmentSlot[]> => {
  await networkDelay();
  const raw = localStorage.getItem(CLOUD_KEYS.SLOTS);
  // Fixed: Only initialize mock data if the KEY DOES NOT EXIST (null).
  // If key exists but is empty array [], that is valid state (all deleted).
  let slots: AppointmentSlot[] = [];
  if (raw === null) {
    cloudSet(CLOUD_KEYS.SLOTS, MOCK_SLOTS);
    slots = MOCK_SLOTS;
  } else {
    slots = JSON.parse(raw);
  }

  // Filter out expired slots
  const now = new Date();
  const validSlots = slots.filter(s => {
    // Basic parsing for "10:00 AM" format
    let hourStr = s.time.split(':')[0];
    const isPM = s.time.toLowerCase().includes('pm');
    let hour = parseInt(hourStr) || 0;
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    let slotDate;
    if (s.date.toLowerCase() === 'today') {
      slotDate = new Date();
    } else if (s.date.toLowerCase() === 'tomorrow') {
      slotDate = new Date();
      slotDate.setDate(slotDate.getDate() + 1);
    } else {
      let parseStr = s.date;
      if (!/\d{4}/.test(parseStr)) {
        parseStr += `, ${new Date().getFullYear()}`;
      }
      slotDate = new Date(parseStr);
      // If it's a completely unparseable string, assume valid to avoid disappearing UI objects
      if (isNaN(slotDate.getTime())) return true;
    }

    slotDate.setHours(hour, 0, 0, 0);
    return slotDate >= now;
  });

  return validSlots;
};

export const requestSlot = async (slotId: string, studentId: string, studentName: string): Promise<boolean> => {
  await networkDelay();
  const slots = await getSlots();
  const index = slots.findIndex(s => s.id === slotId);
  if (index !== -1 && slots[index].status === 'open') {
    slots[index].status = 'requested';
    slots[index].bookedByStudentId = studentId;
    slots[index].bookedByStudentName = studentName;
    cloudSet(CLOUD_KEYS.SLOTS, slots);
    return true;
  }
  return false;
};

export const updateSlotStatus = async (slotId: string, status: 'confirmed' | 'open'): Promise<void> => {
  await networkDelay();
  const slots = await getSlots();
  const index = slots.findIndex(s => s.id === slotId);
  if (index !== -1) {
    if (status === 'open') {
      slots[index].status = 'open';
      slots[index].bookedByStudentId = undefined;
      slots[index].bookedByStudentName = undefined;
    } else {
      slots[index].status = status;
    }
    cloudSet(CLOUD_KEYS.SLOTS, slots);
  }
};

export const deleteSlot = async (slotId: string) => {
  await networkDelay();
  const slots = await getSlots();
  const newSlots = slots.filter(s => s.id !== slotId);
  cloudSet(CLOUD_KEYS.SLOTS, newSlots);
};

export const createSlot = async (slot: AppointmentSlot) => {
  await networkDelay();
  const slots = await getSlots();
  slots.push(slot);
  cloudSet(CLOUD_KEYS.SLOTS, slots);
};

// --- Wellness Tasks ---
export const getTasks = async (studentEmail: string): Promise<WellnessTask[]> => {
  await networkDelay();
  const allTasks = cloudGet<Record<string, WellnessTask[]>>(CLOUD_KEYS.TASKS, {});
  return allTasks[studentEmail] || [];
};

export const assignTask = async (studentEmail: string, task: WellnessTask) => {
  await networkDelay();
  const allTasks = cloudGet<Record<string, WellnessTask[]>>(CLOUD_KEYS.TASKS, {});
  const studentTasks = allTasks[studentEmail] || [];
  studentTasks.push(task);
  allTasks[studentEmail] = studentTasks;
  cloudSet(CLOUD_KEYS.TASKS, allTasks);
};

export const toggleTaskCompletion = async (studentEmail: string, taskId: string) => {
  const allTasks = cloudGet<Record<string, WellnessTask[]>>(CLOUD_KEYS.TASKS, {});
  const studentTasks = allTasks[studentEmail] || [];
  const updatedTasks = studentTasks.map(t =>
    t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
  );
  allTasks[studentEmail] = updatedTasks;
  cloudSet(CLOUD_KEYS.TASKS, allTasks);
};

export const deleteTask = async (studentEmail: string, taskId: string): Promise<void> => {
  const allTasks = cloudGet<Record<string, WellnessTask[]>>(CLOUD_KEYS.TASKS, {});
  const studentTasks = allTasks[studentEmail] || [];
  allTasks[studentEmail] = studentTasks.filter(t => t.id !== taskId);
  cloudSet(CLOUD_KEYS.TASKS, allTasks);
};

/** Returns tasks grouped by student email for the counselor dashboard */
export const getCounselorAssignedTasks = async (): Promise<{ studentEmail: string; tasks: WellnessTask[] }[]> => {
  await networkDelay();
  const allTasks = cloudGet<Record<string, WellnessTask[]>>(CLOUD_KEYS.TASKS, {});
  return Object.entries(allTasks).map(([studentEmail, tasks]) => ({ studentEmail, tasks }));
};

// --- Survey Results ---
const SURVEYS_KEY = 'speakup_cloud_surveys';
export interface SurveyResult {
  id: string; userId: string; surveyType: 'GAD7' | 'BDI';
  score: number; maxScore: number; answers: number[]; completedAt: string;
}
export const saveSurveyResult = async (result: SurveyResult): Promise<void> => {
  await networkDelay();
  const all = cloudGet<SurveyResult[]>(SURVEYS_KEY, []);
  all.unshift(result);
  cloudSet(SURVEYS_KEY, all);
};
export const getSurveyResults = async (userId: string): Promise<SurveyResult[]> => {
  await networkDelay();
  return cloudGet<SurveyResult[]>(SURVEYS_KEY, []).filter(r => r.userId === userId);
};

// --- Wellness Leave ---
export const getActiveLeave = async (studentId: string): Promise<WellnessLeave | null> => {
  await networkDelay();
  const allLeaves = cloudGet<WellnessLeave[]>('speakup_cloud_leaves', []);
  return allLeaves.find(l => l.studentId === studentId && l.status === 'approved') || null;
};

// --- Consents ---
export const saveConsent = async (consent: ConsentData) => {
  await networkDelay();
  const allConsents = cloudGet<Record<string, ConsentData>>(CLOUD_KEYS.CONSENTS, {});
  allConsents[consent.slotId] = consent;
  cloudSet(CLOUD_KEYS.CONSENTS, allConsents);
};

export const getConsentForSlot = async (slotId: string): Promise<ConsentData | null> => {
  await networkDelay();
  const allConsents = cloudGet<Record<string, ConsentData>>(CLOUD_KEYS.CONSENTS, {});
  return allConsents[slotId] || null;
};

// --- Journal ---
export const saveJournal = async (userId: string, entry: JournalEntry) => {
  await networkDelay();
  const allJournals = cloudGet<Record<string, JournalEntry[]>>(CLOUD_KEYS.JOURNALS, {});
  const userJournals = allJournals[userId] || [];

  const entryDate = entry.date.split('T')[0]; // Normalize to YYYY-MM-DD
  const entryIndex = userJournals.findIndex(j => j.date.startsWith(entryDate));

  const encryptedText = encryptData(entry.encryptedText);

  if (entryIndex > -1) {
    // Update existing entry's text
    userJournals[entryIndex].encryptedText = encryptedText;
  } else {
    // Add new entry, ensuring text is encrypted
    const encryptedEntry = { ...entry, encryptedText };
    userJournals.push(encryptedEntry);
  }

  allJournals[userId] = userJournals;
  cloudSet(CLOUD_KEYS.JOURNALS, allJournals);
};

export const getJournals = async (userId: string): Promise<JournalEntry[]> => {
  await networkDelay();
  const allJournals = cloudGet<Record<string, JournalEntry[]>>(CLOUD_KEYS.JOURNALS, {});
  const userJournals = allJournals[userId] || [];
  return userJournals.map(j => ({ ...j, encryptedText: decryptData(j.encryptedText) }));
};

// --- Wellness Posts (Counselor → Student Wall) ---
const POSTS_KEY = 'speakup_cloud_posts';

export const createPost = async (post: import('../types').WellnessPost): Promise<void> => {
  await networkDelay();
  const posts = cloudGet<import('../types').WellnessPost[]>(POSTS_KEY, []);
  posts.unshift(post); // newest first
  cloudSet(POSTS_KEY, posts);
};

export const getAllPosts = async (): Promise<import('../types').WellnessPost[]> => {
  await networkDelay();
  const posts = cloudGet<import('../types').WellnessPost[]>(POSTS_KEY, []);
  // Pinned posts always first
  return [...posts.filter(p => p.isPinned), ...posts.filter(p => !p.isPinned)];
};

export const deletePost = async (postId: string): Promise<void> => {
  await networkDelay();
  const posts = cloudGet<import('../types').WellnessPost[]>(POSTS_KEY, []);
  cloudSet(POSTS_KEY, posts.filter(p => p.id !== postId));
};

export const togglePinPost = async (postId: string): Promise<void> => {
  await networkDelay();
  const posts = cloudGet<import('../types').WellnessPost[]>(POSTS_KEY, []);
  const updated = posts.map(p => p.id === postId ? { ...p, isPinned: !p.isPinned } : p);
  cloudSet(POSTS_KEY, updated);
};

// --- Analytics ---
export const getAdminAnalytics = async (metricKey: string, groupBy: string) => {
  await networkDelay();
  const programs = ['PGPM', 'FPM', 'PGDM', 'GMP'];
  const genders = ['Male', 'Female', 'Non-Binary'];
  const years = ['2023', '2024'];

  let labels = programs;
  if (groupBy === 'gender') labels = genders;
  if (groupBy === 'year') labels = years;

  return labels.map(label => ({
    name: label,
    value: Math.floor(Math.random() * 40) + 60
  }));
};