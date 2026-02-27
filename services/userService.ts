/**
 * userService.ts
 * Firestore CRUD for SPeakUp user profiles.
 *
 * Firestore path: users/{uid}
 *
 * Called by:
 *  - App.tsx (onAuthStateChanged) — to restore user profile on page load
 *  - LoginScreen.tsx — on first Google login, creates the profile doc
 *  - ProfileSettingsModal.tsx — to update firstName, middleName, lastName, phone
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { User } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';

/** Generates a unique casefile ID like SPJ-A3BF-92ZX */
const generateCasefileId = (): string => {
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `SPJ-${timestamp}-${random}`;
};

/**
 * Fetches the user profile from Firestore.
 * If the user has never logged in before, creates a new profile document
 * with defaults derived from their Google account (displayName, email).
 * New users are assigned `role: 'student'` by default.
 * Admins can change role in Firebase Console for counselors/admins.
 */
export const getOrCreateUserProfile = async (fbUser: FirebaseUser): Promise<User> => {
    const ref = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        // Existing user — return their Firestore profile
        const data = snap.data() as User;
        // Ensure the display name stays synced with structured fields
        const name = [data.firstName, data.middleName, data.lastName]
            .filter(Boolean)
            .join(' ') || data.name || fbUser.displayName || fbUser.email!.split('@')[0];
        return { ...data, name };
    }

    // ── First-time login: create a new profile ──────────────────────────────────
    // Parse displayName ("Rohan Mehta" → firstName="Rohan", lastName="Mehta")
    const displayName = fbUser.displayName || '';
    const parts = displayName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const middleName = parts.length >= 3 ? parts.slice(1, -1).join(' ') : '';
    const lastName = parts.length >= 2 ? parts[parts.length - 1] : '';

    const newProfile: User = {
        id: fbUser.uid,
        email: fbUser.email!,
        firstName,
        middleName,
        lastName,
        name: displayName || fbUser.email!.split('@')[0],
        phone: '',
        role: 'student', // Default — change in Firebase Console for counselors/admins
        casefileId: generateCasefileId(),
        program: '',
        likes: [],
        dislikes: [],
    };

    await setDoc(ref, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return newProfile;
};

/**
 * Fetches a user profile by UID. Returns null if not found.
 * Used by App.tsx when session is restored on page reload.
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as User;
    const name = [data.firstName, data.middleName, data.lastName]
        .filter(Boolean)
        .join(' ') || data.name;
    return { ...data, name };
};

/**
 * Updates editable profile fields (name parts, phone, program, likes, dislikes).
 * Called from ProfileSettingsModal on Save.
 */
export const updateUserProfile = async (
    uid: string,
    updates: Partial<Pick<User, 'firstName' | 'middleName' | 'lastName' | 'phone' | 'program' | 'likes' | 'dislikes'>>
): Promise<void> => {
    // Recompute display name from structured fields when saving
    const name = [updates.firstName, updates.middleName, updates.lastName]
        .filter(Boolean)
        .join(' ');

    await updateDoc(doc(db, 'users', uid), {
        ...updates,
        ...(name ? { name } : {}),
        updatedAt: serverTimestamp(),
    });
};
