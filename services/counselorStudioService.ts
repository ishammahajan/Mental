import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db as firestoreDb } from './firebaseConfig';
import type {
  CounselorEmailThread,
  CounselorReport,
  CounselorTaskItem,
  ForgeQuestion,
  ForgeResponse,
  ForgeSurvey,
} from '../types';
import { isDemoMode } from './demoMode';
import {
  DEMO_COUNSELOR_TASKS,
  DEMO_EMAIL_THREADS,
  DEMO_REPORTS,
  DEMO_RESPONSES,
  DEMO_SURVEYS,
} from '../data/demoData';

const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || '';
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_CHAT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

const EMAIL_THREADS = 'counselor_email_threads';
const REPORTS = 'counselor_reports';
const SURVEYS = 'forge_surveys';
const RESPONSES = 'forge_responses';
const TASKS = 'counselor_tasks';

const LOCAL_KEYS = {
  EMAILS: 'speakup_mock_email_threads',
  SURVEYS: 'speakup_mock_forge_surveys',
  RESPONSES: 'speakup_mock_forge_responses',
  TASKS: 'speakup_mock_counselor_tasks',
  REPORTS: 'speakup_mock_reports',
};

const DEMO_STUDIO_SEED_KEY = 'speakup_demo_studio_seeded';

const localGet = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const localSet = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore local storage errors in demo mode.
  }
};

const seedIfMissing = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(key) === null) {
    localSet(key, value);
  }
};

export const ensureCounselorStudioSeeded = (): void => {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(DEMO_STUDIO_SEED_KEY) === 'true') return;

    seedIfMissing(LOCAL_KEYS.EMAILS, DEMO_EMAIL_THREADS);
    seedIfMissing(LOCAL_KEYS.SURVEYS, DEMO_SURVEYS);
    seedIfMissing(LOCAL_KEYS.RESPONSES, DEMO_RESPONSES);
    seedIfMissing(LOCAL_KEYS.TASKS, DEMO_COUNSELOR_TASKS);
    seedIfMissing(LOCAL_KEYS.REPORTS, DEMO_REPORTS);

    window.localStorage.setItem(DEMO_STUDIO_SEED_KEY, 'true');
  } catch {
    // Ignore storage errors in demo mode.
  }
};

const subscribeLocal = <T,>(
  key: string,
  selector: (items: T[]) => T[],
  callback: (items: T[]) => void,
): Unsubscribe => {
  const emit = () => callback(selector(localGet<T[]>(key, [])));
  emit();

  const channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('speakup_sync')
    : null;

  const onStorage = (event: StorageEvent) => {
    if (event.key === key) emit();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  const interval = setInterval(emit, 4000);

  if (channel) {
    channel.onmessage = (event) => {
      if (event?.data?.key === key) emit();
    };
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
    clearInterval(interval);
    if (channel) channel.close();
  };
};

const mergeById = <T extends { id: string }>(values: T[]): T[] => {
  const map = new Map<string, T>();
  values.forEach((value) => map.set(value.id, value));
  return Array.from(map.values());
};

const normalizeScale = (rawScale: unknown, fallback: number): number => {
  const numeric = typeof rawScale === 'number' ? rawScale : Number(rawScale);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  if ([3, 5, 7].includes(numeric)) return numeric;
  return fallback;
};

const buildScaleMeanings = (scale: number): string[] => {
  if (!Number.isFinite(scale) || scale <= 0) return [];
  return Array.from({ length: scale }, (_, i) => `Score ${i + 1}: ${i + 1 === scale ? 'High' : 'Moderate'}`);
};

const extractQuestionsHeuristic = (text: string, limit: number): string[] => {
  const lines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const candidates = lines.filter(line =>
    line.endsWith('?') ||
    /^(\d+\.|\(|\[)?\s*[A-Za-z].{12,}\.?$/.test(line)
  );
  const unique = Array.from(new Set(candidates));
  return unique.slice(0, limit);
};

export const extractForgeQuestionsFromText = async (
  sourceText: string,
  options?: { maxQuestions?: number; defaultScale?: number }
): Promise<ForgeQuestion[]> => {
  const maxQuestions = Number.isFinite(options?.maxQuestions) && (options?.maxQuestions as number) > 0
    ? Math.floor(options?.maxQuestions as number)
    : 8;
  const defaultScale = normalizeScale(options?.defaultScale, 5);
  const sanitizedText = sourceText.replace(/\s+/g, ' ').trim();
  if (!sanitizedText) return [];

  try {
    if (!HF_TOKEN) throw new Error('VITE_HF_TOKEN is not set');

    const minCount = Math.min(maxQuestions, Math.max(2, Math.floor(maxQuestions / 2)));
    const prompt = `Extract survey items from the source text.
Return ONLY a JSON array (no markdown, no prose).

Schema per item:
{ "text": string, "scale": number, "meanings": string[] }

Hard requirements:
- Return between ${minCount} and ${maxQuestions} items.
- Do NOT merge multiple source questions into one item.
- Keep each text concise (max 160 chars).
- scale must be 3, 5, or 7. Prefer ${defaultScale}.
- meanings length must exactly equal scale.
- If labels are missing, output: Score 1..Score N.

Source text:
${sanitizedText.slice(0, 18000)}`;

    const res = await fetch(HF_ROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: HF_CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 900,
        temperature: 0.15,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || `HuggingFace extraction failed with status ${res.status}`);
    }

    const data = await res.json();
    let raw = data?.choices?.[0]?.message?.content?.trim() || '';
    if (raw.startsWith('```json')) {
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Model returned invalid JSON payload');

    const parsed = JSON.parse(match[0]);
    const extractedQuestions = Array.isArray(parsed) ? parsed : [];

    if (extractedQuestions.length > 0) {
      return extractedQuestions.map((item: { text: string; scale?: number; meanings?: string[] }, index: number) => {
        const scale = normalizeScale(item?.scale, defaultScale);
        const meanings = Array.isArray(item?.meanings) && item.meanings.length === scale
          ? item.meanings
          : buildScaleMeanings(scale);
        return {
          id: `q${index + 1}`,
          text: String(item.text || '').trim(),
          scale,
          meanings,
        };
      }).filter((q: ForgeQuestion) => q.text.length > 0);
    }
  } catch (error) {
    console.warn('[Forge Extract] Direct HF extraction failed, using heuristic fallback.', error);
  }

  const questionTexts = extractQuestionsHeuristic(sanitizedText, maxQuestions);

  return questionTexts.map((text, index) => {
    const scale = defaultScale;
    const meanings = buildScaleMeanings(scale);
    return {
      id: `q${index + 1}`,
      text,
      scale,
      meanings,
    };
  });
};

export const upsertEmailThread = async (thread: CounselorEmailThread): Promise<void> => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    const threads = localGet<CounselorEmailThread[]>(LOCAL_KEYS.EMAILS, []);
    const updated = mergeById([...threads.filter(t => t.id !== thread.id), thread]);
    localSet(LOCAL_KEYS.EMAILS, updated);
    return;
  }
  await setDoc(doc(firestoreDb, EMAIL_THREADS, thread.id), {
    ...thread,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

export const subscribeEmailThreadsForCounselor = (
  counselorId: string,
  callback: (threads: CounselorEmailThread[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<CounselorEmailThread>(
      LOCAL_KEYS.EMAILS,
      (threads) => threads.filter(t => t.counselorId === counselorId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, EMAIL_THREADS), where('counselorId', '==', counselorId));
  return onSnapshot(q, (snap) => {
    const threads = snap.docs.map((d) => d.data() as CounselorEmailThread);
    callback(threads);
  });
};

export const subscribeEmailThreadsForStudent = (
  studentId: string,
  callback: (threads: CounselorEmailThread[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<CounselorEmailThread>(
      LOCAL_KEYS.EMAILS,
      (threads) => threads.filter(t => t.studentId === studentId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, EMAIL_THREADS), where('studentId', '==', studentId));
  return onSnapshot(q, (snap) => {
    const threads = snap.docs.map((d) => d.data() as CounselorEmailThread);
    callback(threads);
  });
};

export const saveReport = async (report: CounselorReport): Promise<void> => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    const reports = localGet<CounselorReport[]>(LOCAL_KEYS.REPORTS, []);
    const updated = mergeById([...reports.filter(r => r.id !== report.id), report]);
    localSet(LOCAL_KEYS.REPORTS, updated);
    return;
  }
  await setDoc(doc(firestoreDb, REPORTS, report.id), report, { merge: true });
};

export const subscribeReportsForCounselor = (
  counselorId: string,
  callback: (reports: CounselorReport[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<CounselorReport>(
      LOCAL_KEYS.REPORTS,
      (reports) => reports.filter(r => r.counselorId === counselorId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, REPORTS), where('counselorId', '==', counselorId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as CounselorReport));
  });
};

export const subscribeReportsForStudent = (
  studentId: string,
  callback: (reports: CounselorReport[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<CounselorReport>(
      LOCAL_KEYS.REPORTS,
      (reports) => reports.filter(r => r.studentId === studentId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, REPORTS), where('studentId', '==', studentId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as CounselorReport));
  });
};

export const saveForgeSurvey = async (survey: ForgeSurvey): Promise<void> => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    const surveys = localGet<ForgeSurvey[]>(LOCAL_KEYS.SURVEYS, []);
    const updated = mergeById([...surveys.filter(s => s.id !== survey.id), survey]);
    localSet(LOCAL_KEYS.SURVEYS, updated);
    return;
  }
  await setDoc(doc(firestoreDb, SURVEYS, survey.id), survey, { merge: true });
};

export const subscribeForgeSurveysForCounselor = (
  counselorId: string,
  callback: (surveys: ForgeSurvey[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<ForgeSurvey>(
      LOCAL_KEYS.SURVEYS,
      (surveys) => surveys.filter(s => s.counselorId === counselorId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, SURVEYS), where('counselorId', '==', counselorId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as ForgeSurvey));
  });
};

export const subscribeForgeSurveysForStudent = (
  studentId: string,
  programId: string | undefined,
  callback: (surveys: ForgeSurvey[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<ForgeSurvey>(
      LOCAL_KEYS.SURVEYS,
      (surveys) => surveys.filter(s =>
        (s.assignedStudentIds || []).includes(studentId) ||
        (programId ? (s.assignedGroupIds || []).includes(programId) : false)
      ),
      callback,
    );
  }
  const baseCollection = collection(firestoreDb, SURVEYS);
  const unsubs: Unsubscribe[] = [];
  let studentSurveys: ForgeSurvey[] = [];
  let groupSurveys: ForgeSurvey[] = [];

  const emit = () => callback(mergeById([...studentSurveys, ...groupSurveys]));

  unsubs.push(onSnapshot(query(baseCollection, where('assignedStudentIds', 'array-contains', studentId)), (snap) => {
    studentSurveys = snap.docs.map((d) => d.data() as ForgeSurvey);
    emit();
  }));

  if (programId) {
    unsubs.push(onSnapshot(query(baseCollection, where('assignedGroupIds', 'array-contains', programId)), (snap) => {
      groupSurveys = snap.docs.map((d) => d.data() as ForgeSurvey);
      emit();
    }));
  }

  return () => unsubs.forEach((u) => u());
};

export const saveForgeResponse = async (response: ForgeResponse): Promise<void> => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    const responses = localGet<ForgeResponse[]>(LOCAL_KEYS.RESPONSES, []);
    const updated = mergeById([...responses.filter(r => r.id !== response.id), response]);
    localSet(LOCAL_KEYS.RESPONSES, updated);
    return;
  }
  await setDoc(doc(firestoreDb, RESPONSES, response.id), response, { merge: true });
};

export const subscribeForgeResponsesForCounselor = (
  surveyId: string,
  callback: (responses: ForgeResponse[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<ForgeResponse>(
      LOCAL_KEYS.RESPONSES,
      (responses) => responses.filter(r => r.surveyId === surveyId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, RESPONSES), where('surveyId', '==', surveyId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as ForgeResponse));
  });
};

export const subscribeForgeResponsesForStudent = (
  studentId: string,
  callback: (responses: ForgeResponse[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<ForgeResponse>(
      LOCAL_KEYS.RESPONSES,
      (responses) => responses.filter(r => r.studentId === studentId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, RESPONSES), where('studentId', '==', studentId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as ForgeResponse));
  });
};

export const saveCounselorTask = async (task: CounselorTaskItem): Promise<void> => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    const tasks = localGet<CounselorTaskItem[]>(LOCAL_KEYS.TASKS, []);
    const updated = mergeById([...tasks.filter(t => t.id !== task.id), task]);
    localSet(LOCAL_KEYS.TASKS, updated);
    return;
  }
  await setDoc(doc(firestoreDb, TASKS, task.id), task, { merge: true });
};

export const updateCounselorTaskCompletion = async (taskId: string, completedAt?: string): Promise<void> => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    const tasks = localGet<CounselorTaskItem[]>(LOCAL_KEYS.TASKS, []);
    const updated = tasks.map(task => task.id === taskId
      ? { ...task, completedAt: completedAt || null }
      : task
    );
    localSet(LOCAL_KEYS.TASKS, updated);
    return;
  }
  await updateDoc(doc(firestoreDb, TASKS, taskId), { completedAt: completedAt || null });
};

export const subscribeCounselorTasksForCounselor = (
  counselorId: string,
  callback: (tasks: CounselorTaskItem[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<CounselorTaskItem>(
      LOCAL_KEYS.TASKS,
      (tasks) => tasks.filter(t => t.counselorId === counselorId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, TASKS), where('counselorId', '==', counselorId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as CounselorTaskItem));
  });
};

export const subscribeCounselorTasksForStudent = (
  studentId: string,
  callback: (tasks: CounselorTaskItem[]) => void,
): Unsubscribe => {
  if (isDemoMode()) {
    ensureCounselorStudioSeeded();
    return subscribeLocal<CounselorTaskItem>(
      LOCAL_KEYS.TASKS,
      (tasks) => tasks.filter(t => t.studentId === studentId),
      callback,
    );
  }
  const q = query(collection(firestoreDb, TASKS), where('studentId', '==', studentId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as CounselorTaskItem));
  });
};
