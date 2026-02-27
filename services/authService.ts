/**
 * authService.ts
 * Firebase Google Authentication for SPeakUp.
 * - Only allows @spjimr.org email addresses.
 * - Session persistence is handled automatically by Firebase (browserLocalPersistence).
 * - Use onAuthChange in App.tsx to restore session on page load.
 */

import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

const ALLOWED_DOMAIN = '@spjimr.org';

// Force Google account picker every time (no silent auto-select)
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/**
 * Opens Google Sign-In popup.
 * If the account is not @spjimr.org, signs the user out and throws an error.
 */
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (!user.email?.endsWith(ALLOWED_DOMAIN)) {
        // Immediately revoke the Firebase session for non-SPJIMR accounts
        await firebaseSignOut(auth);
        throw new Error(`Access restricted. Please use your ${ALLOWED_DOMAIN} email address.`);
    }

    return user;
};

/**
 * Signs in with email + password (for hardcoded staff accounts: counselor, admin).
 * Also enforces @spjimr.org domain restriction.
 */
export const signInWithEmailPassword = async (
    email: string,
    password: string
): Promise<FirebaseUser> => {
    if (!email.endsWith(ALLOWED_DOMAIN)) {
        throw new Error(`Access restricted. Only ${ALLOWED_DOMAIN} accounts are allowed.`);
    }
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (err: any) {
        // Translate Firebase error codes into user-friendly messages
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            throw new Error('Invalid email or password. Please try again.');
        }
        if (err.code === 'auth/too-many-requests') {
            throw new Error('Too many failed attempts. Please wait a few minutes and try again.');
        }
        throw new Error(err.message || 'Sign-in failed. Please try again.');
    }
};

/**
 * Signs the current user out of Firebase.
 * Clears the local session — LoginScreen will be shown on next load.
 */
export const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
};

/**
 * Subscribes to Firebase auth state changes.
 * Call this in App.tsx's useEffect to:
 *  - Restore the session when the page is reloaded
 *  - React to sign-in / sign-out events
 *
 * @returns Unsubscribe function — call it in useEffect cleanup
 */
export const onAuthChange = (
    callback: (user: FirebaseUser | null) => void
): (() => void) => onAuthStateChanged(auth, callback);

/**
 * Returns the currently signed-in Firebase user, or null.
 * Synchronous — use onAuthChange for reactive state.
 */
export const getCurrentUser = (): FirebaseUser | null => auth.currentUser;
