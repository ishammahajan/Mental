/**
 * slotService.ts
 * Firestore-backed appointment slot management for SPeakUp.
 *
 * Replaces the localStorage slot functions in storage.ts, enabling
 * real-time cross-device sync between students and counselors.
 *
 * Firestore collection: slots/{slotId}
 */

import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { AppointmentSlot } from '../types';

const SLOTS_COL = 'slots';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the slot should be displayed.
 * - 'requested' and 'confirmed' slots are ALWAYS kept (even if time passed).
 * - 'open' slots are filtered out once their date+time is in the past.
 */
const isSlotValid = (slot: AppointmentSlot): boolean => {
    // Never hide booked or confirmed slots — counselor/student must always see them
    if (slot.status === 'requested' || slot.status === 'confirmed') return true;

    const now = new Date();
    const timeStr = slot.time || '';
    const dateStr = slot.date || '';

    let hourStr = timeStr.split(':')[0];
    const isPM = timeStr.toLowerCase().includes('pm');
    let hour = parseInt(hourStr) || 0;
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    let slotDate: Date;
    const lower = dateStr.toLowerCase().trim();
    if (lower === 'today') {
        slotDate = new Date();
    } else if (lower === 'tomorrow') {
        slotDate = new Date();
        slotDate.setDate(slotDate.getDate() + 1);
    } else {
        let parseStr = dateStr;
        if (!/\d{4}/.test(parseStr)) parseStr += `, ${new Date().getFullYear()}`;
        slotDate = new Date(parseStr);
        if (isNaN(slotDate.getTime())) return true; // unparseable → keep
    }

    slotDate.setHours(hour, 0, 0, 0);
    return slotDate >= now;
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all future slots from Firestore (one-time read).
 * Used by both StudentDashboard and CounselorDashboard on mount.
 */
export const getSlots = async (): Promise<AppointmentSlot[]> => {
    const q = query(collection(db, SLOTS_COL), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    const slots: AppointmentSlot[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<AppointmentSlot, 'id'>),
    }));
    return slots.filter(isSlotValid);
};

/**
 * Creates a new slot in Firestore (counselor only).
 */
export const createSlot = async (slot: Omit<AppointmentSlot, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, SLOTS_COL), {
        ...slot,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
};

/**
 * Student books an open slot — marks it as 'requested'.
 * Returns false if slot is already taken (optimistic concurrency guard).
 */
export const requestSlot = async (
    slotId: string,
    studentId: string,
    studentName: string
): Promise<boolean> => {
    try {
        const ref = doc(db, SLOTS_COL, slotId);
        await updateDoc(ref, {
            status: 'requested',
            bookedByStudentId: studentId,
            bookedByStudentName: studentName,
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch {
        return false;
    }
};

/**
 * Counselor confirms or rejects a requested slot.
 * 'open' = rejected (slot is freed up again).
 * 'confirmed' = accepted.
 */
export const updateSlotStatus = async (
    slotId: string,
    status: 'confirmed' | 'open'
): Promise<void> => {
    const ref = doc(db, SLOTS_COL, slotId);
    if (status === 'open') {
        await updateDoc(ref, {
            status: 'open',
            bookedByStudentId: null,
            bookedByStudentName: null,
            updatedAt: serverTimestamp(),
        });
    } else {
        await updateDoc(ref, { status, updatedAt: serverTimestamp() });
    }
};

/**
 * Deletes a slot permanently (counselor only).
 */
export const deleteSlot = async (slotId: string): Promise<void> => {
    await deleteDoc(doc(db, SLOTS_COL, slotId));
};

/**
 * Updates an existing slot's details (counselor edits date/time).
 * Only works on 'open' slots — cannot edit already-booked ones.
 */
export const updateSlot = async (
    slotId: string,
    updates: Partial<Pick<AppointmentSlot, 'date' | 'time' | 'counselorName'>>
): Promise<void> => {
    await updateDoc(doc(db, SLOTS_COL, slotId), {
        ...updates,
        updatedAt: serverTimestamp(),
    });
};

// ── Real-time listener ────────────────────────────────────────────────────────

/**
 * Subscribes to live Firestore slot updates.
 * Call this in useEffect — returns an unsubscribe function for cleanup.
 *
 * Both StudentDashboard and CounselorDashboard use this to get instant
 * updates when the other side books/approves/rejects a slot.
 *
 * @example
 * useEffect(() => {
 *   const unsub = subscribeToSlots(slots => setSlots(slots));
 *   return () => unsub();
 * }, []);
 */
export const subscribeToSlots = (callback: (slots: AppointmentSlot[]) => void): Unsubscribe => {
    const q = query(collection(db, SLOTS_COL), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => {
        const slots: AppointmentSlot[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<AppointmentSlot, 'id'>),
        }));
        callback(slots.filter(isSlotValid));
    });
};
