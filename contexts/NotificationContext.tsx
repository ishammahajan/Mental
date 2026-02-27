import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date | string;
  isRead: boolean;
  targetRole?: 'counselor' | 'student' | 'admin';
  targetUserId?: string;
}

interface NotificationContextType {
  notifications: Notification[];       // toast (auto-dismiss)
  storedNotifications: Notification[]; // persists in bell dropdown
  unreadCount: (role: string, uid: string) => number;
  addNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning', targetRole?: 'counselor' | 'student' | 'admin', targetUserId?: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  clearOne: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [storedNotifications, setStoredNotifications] = useState<Notification[]>([]);

  // Load initial notifications for Counselor
  useEffect(() => {
    const data = localStorage.getItem('speakup_cloud_notifications');
    if (data) {
      setStoredNotifications(JSON.parse(data));
    }

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('speakup_sync');
      channel.onmessage = (e) => {
        if (e.data?.key === 'speakup_cloud_notifications') {
          const fresh = localStorage.getItem('speakup_cloud_notifications');
          if (fresh) setStoredNotifications(JSON.parse(fresh));
        }
      };
      return () => channel.close();
    }
  }, []);

  const syncStored = (newNotes: Notification[]) => {
    setStoredNotifications(newNotes);
    localStorage.setItem('speakup_cloud_notifications', JSON.stringify(newNotes));
    if (typeof BroadcastChannel !== 'undefined') {
      new BroadcastChannel('speakup_sync').postMessage({ key: 'speakup_cloud_notifications' });
    }
  };

  const addNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning', targetRole?: 'counselor' | 'student' | 'admin', targetUserId?: string) => {
    const id = new Date().getTime();
    const notification: Notification = { id, message, type, timestamp: new Date().toISOString(), isRead: false, targetRole, targetUserId };

    // Toast popups only for the current local user if it's untargeted or targeted correctly (we check rendering later)
    if (!targetRole && !targetUserId) {
      setNotifications(prev => [...prev, notification]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
    }

    // Persist in stored list
    syncStored([notification, ...storedNotifications].slice(0, 50));
  };

  const markAllRead = () => syncStored(storedNotifications.map(n => ({ ...n, isRead: true })));
  const clearAll = () => syncStored([]);
  const clearOne = (id: number) => syncStored(storedNotifications.filter(n => n.id !== id));

  const unreadCount = (role: string, uid: string) => storedNotifications.filter(n => {
    if (n.isRead) return false;
    if (n.targetRole && n.targetRole !== role) return false;
    if (n.targetUserId && n.targetUserId !== uid) return false;
    return true;
  }).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      storedNotifications,
      unreadCount,
      addNotification,
      markAllRead,
      clearAll,
      clearOne,
    }}>
      {children}
      {/* Toast popups */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg text-white animate-in slide-in-from-top duration-300 pointer-events-auto ${notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
              }`}
          >
            {notification.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
