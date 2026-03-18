const DEMO_MODE_KEY = 'speakup_demo_mode';

const hasFirebaseConfig = () => Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

export const hasGeminiKey = () => Boolean(import.meta.env.VITE_GEMINI_API_KEY);

const getStoredDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setDemoMode = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      window.localStorage.setItem(DEMO_MODE_KEY, 'true');
    } else {
      window.localStorage.removeItem(DEMO_MODE_KEY);
    }
  } catch {
    // Ignore storage errors for demo mode.
  }
};

export const isDemoMode = (): boolean => {
  const envFlag = import.meta.env.VITE_DEMO_MODE === 'true';
  if (envFlag) return true;
  if (!hasFirebaseConfig()) return true;
  return getStoredDemoMode();
};
