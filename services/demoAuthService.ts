import type { Role, User } from '../types';
import { DEMO_USERS } from '../data/demoData';

const DEMO_USER_KEY = 'speakup_demo_user';

const pickDemoUser = (role: Role): User => {
  const match = DEMO_USERS.find((u) => u.role === role);
  if (match) return match;
  return {
    id: `demo_${role}`,
    name: `${role.charAt(0).toUpperCase()}${role.slice(1)} Demo`,
    email: `${role}@spjimr.org`,
    role,
  } as User;
};

export const getDemoSessionUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEMO_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const signInAsDemoRole = (role: Role): User => {
  const user = pickDemoUser(role);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage errors for demo mode.
    }
  }
  return user;
};

export const signOutDemo = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DEMO_USER_KEY);
  } catch {
    // Ignore storage errors for demo mode.
  }
};
