import React, { useState } from 'react';
import StudentDashboard from './components/StudentDashboard';
import CounselorDashboard from './components/CounselorDashboard';
import AdminDashboard from './components/AdminDashboard';
import CrisisOverlay from './components/CrisisOverlay';
import LoginScreen from './components/LoginScreen';
import NoApiKeyFallback from './components/NoApiKeyFallback.tsx';
import { Role, User } from './types';
import { SParshProvider } from './contexts/SParshContext';
import { NotificationProvider } from './contexts/NotificationContext';

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const [user, setUser] = useState<User | null>(null);
  const [isCrisisMode, setIsCrisisMode] = useState(false);

  // Check for API Key at the top level
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return <NoApiKeyFallback />;
  }

    const handleLogin = (loggedInUser: User) => {
    setCurrentRole(loggedInUser.role);
    setUser(loggedInUser);
  };

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
            />
          )}
          {currentRole === 'counselor' && (
            <CounselorDashboard />
          )}
          {currentRole === 'admin' && (
            <AdminDashboard />
          )}
          </div>
        </main>
      </div>
    </SParshProvider>
    </NotificationProvider>
  );
}