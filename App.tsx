import React, { useState, useEffect } from 'react';
import StudentDashboard from './components/StudentDashboard';
import CounselorDashboard from './components/CounselorDashboard';
import AdminDashboard from './components/AdminDashboard';
import CrisisOverlay from './components/CrisisOverlay';
import LoginScreen from './components/LoginScreen';
import NoApiKeyFallback from './components/NoApiKeyFallback.tsx';
import { Role, User } from './types';
import { SParshProvider } from './contexts/SParshContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { onAuthChange } from './services/authService';
import { getOrCreateUserProfile } from './services/userService';

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isCrisisMode, setIsCrisisMode] = useState(false);
  // Loading state while Firebase resolves the session on page load
  const [authLoading, setAuthLoading] = useState(true);

  // ── Session restore via Firebase onAuthStateChanged ─────────────────────────
  // Fires automatically on page load:
  //   • If user was previously logged in → Firebase returns the cached user
  //   • If not → user is null → show LoginScreen
  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await getOrCreateUserProfile(fbUser);
          setUser(profile);
          setCurrentRole(profile.role);
        } catch (err) {
          console.error('[App] Failed to load profile from Firestore:', err);
          setUser(null);
          setCurrentRole(null);
        }
      } else {
        setUser(null);
        setCurrentRole(null);
      }
      setAuthLoading(false);
    });

    // Clean up listener when App unmounts
    return () => unsubscribe();
  }, []);

  // Called by LoginScreen after a fresh Google Sign-In
  // (onAuthChange will also fire, but this makes the transition instant)
  const handleLogin = (loggedInUser: User) => {
    setCurrentRole(loggedInUser.role);
    setUser(loggedInUser);
  };

  // Called by dashboards when user logs out (authService.signOut was called)
  // onAuthChange will fire and clear the state, but this handles optimistic UI
  const handleLogout = () => {
    setUser(null);
    setCurrentRole(null);
  };

  // Check for API Key at the top level
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return <NoApiKeyFallback />;
  }

  // While Firebase is checking the session, show a minimal loading screen
  // that matches the app's sand background (no flash of wrong content)
  if (authLoading) {
    return (
      <div className="h-screen w-full bg-[#E6DDD0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-[#8A9A5B] rounded-full opacity-20 animate-ping" />
            <div className="absolute inset-2 bg-[#8A9A5B] rounded-full opacity-40 animate-pulse" />
            <div className="absolute inset-4 bg-[#8A9A5B] rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">S</span>
            </div>
          </div>
          <p className="text-[#708090]/60 text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <NotificationProvider>
      <SParshProvider>
        <div className="min-h-screen bg-[#E6DDD0] relative font-sans">

          {/* Crisis Overlay (Global) */}
          {isCrisisMode && (
            <CrisisOverlay onDismiss={() => setIsCrisisMode(false)} />
          )}

          {/* Main Routing */}
          <main className="w-full">
            <div className="w-full">
              {user && user.role === 'student' && (
                <StudentDashboard
                  triggerCrisis={() => setIsCrisisMode(true)}
                  userEmail={user.email}
                  userId={user.id}
                  user={user}
                  onLogout={handleLogout}
                />
              )}
              {currentRole === 'counselor' && (
                <CounselorDashboard onLogout={handleLogout} />
              )}
              {currentRole === 'admin' && (
                <AdminDashboard onLogout={handleLogout} />
              )}
            </div>
          </main>
        </div>
      </SParshProvider>
    </NotificationProvider>
  );
}