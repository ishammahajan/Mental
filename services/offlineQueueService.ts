/**
 * Offline Message Queue Service
 * Queues messages when offline and syncs when connection restored
 */

import React from 'react';
import { P2PMessage } from '../types';
import * as chatService from './chatService';

const OFFLINE_QUEUE_KEY = 'speakup_offline_queue';
const PENDING_SENDS_KEY = 'speakup_pending_sends';

export interface OfflineMessage {
  id: string;
  message: P2PMessage;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'failed' | 'synced';
}

/**
 * Add message to offline queue
 */
export function queueOfflineMessage(message: P2PMessage): void {
  try {
    const queue = getOfflineQueue();

    const offlineMsg: OfflineMessage = {
      id: `offline_${message.id}_${Date.now()}`,
      message,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    queue.push(offlineMsg);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

    console.log('[OfflineQueue] Message queued:', offlineMsg.id);
  } catch (error) {
    console.error('[OfflineQueue] Failed to queue message:', error);
  }
}

/**
 * Get all queued messages
 */
export function getOfflineQueue(): OfflineMessage[] {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Sync queued messages when connection restored
 */
export async function syncOfflineQueue(
  currentUserId?: string
): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();

  if (queue.length === 0) {
    console.log('[OfflineQueue] No messages to sync');
    return { synced: 0, failed: 0 };
  }

  console.log(`[OfflineQueue] Starting sync of ${queue.length} messages...`);

  let synced = 0;
  let failed = 0;
  const maxRetries = 3;
  const updatedQueue: OfflineMessage[] = [];

  for (const offlineMsg of queue) {
    try {
      // Apply retry logic
      if (offlineMsg.retryCount >= maxRetries) {
        offlineMsg.status = 'failed';
        updatedQueue.push(offlineMsg);
        failed++;
        continue;
      }

      // Send message
      await chatService.sendP2PMessage(offlineMsg.message);

      offlineMsg.status = 'synced';
      synced++;
      console.log(`[OfflineQueue] Synced message: ${offlineMsg.id}`);
    } catch (error) {
      offlineMsg.retryCount++;
      offlineMsg.status = 'pending';
      updatedQueue.push(offlineMsg);
      console.warn(
        `[OfflineQueue] Retry ${offlineMsg.retryCount}/${maxRetries} for ${offlineMsg.id}`,
        error
      );
    }
  }

  // Save updated queue (only keep pending items)
  const pendingQueue = updatedQueue.filter(m => m.status === 'pending');
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(pendingQueue));

  console.log(
    `[OfflineQueue] Sync complete. Synced: ${synced}, Failed: ${failed}, Remaining: ${pendingQueue.length}`
  );

  return { synced, failed };
}

/**
 * Clear failed messages
 */
export function clearFailedMessages(): void {
  const queue = getOfflineQueue();
  const pendingQueue = queue.filter(m => m.status === 'pending');
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(pendingQueue));
}

/**
 * Get offline queue stats
 */
export function getOfflineQueueStats() {
  const queue = getOfflineQueue();
  return {
    total: queue.length,
    pending: queue.filter(m => m.status === 'pending').length,
    failed: queue.filter(m => m.status === 'failed').length,
    oldestAge: queue.length > 0 ? Date.now() - queue[0].timestamp : 0
  };
}

/**
 * Monitor online/offline status and auto-sync
 */
export function initializeOfflineSyncMonitor(): () => void {
  const handleOnline = async () => {
    console.log('[OfflineSync] Connection restored, syncing queued messages...');
    const result = await syncOfflineQueue();

    if (result.synced > 0) {
      // Dispatch custom event for UI to react to
      window.dispatchEvent(
        new CustomEvent('offlineSyncComplete', {
          detail: result
        })
      );
    }
  };

  const handleOffline = () => {
    console.log('[OfflineSync] Connection lost, queueing mode enabled');
    window.dispatchEvent(new CustomEvent('offlineStatusChanged', { detail: true }));
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Check initial status
  if (!navigator.onLine) {
    handleOffline();
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Hook to react to offline events in React components
 */
export function useOfflineSync(
  onSyncComplete?: (result: { synced: number; failed: number }) => void
): { isOffline: boolean; queueSize: number } {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [queueSize, setQueueSize] = React.useState(getOfflineQueue().length);

  React.useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const result = await syncOfflineQueue();
      setQueueSize(getOfflineQueue().length);
      onSyncComplete?.(result);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleQueueUpdate = () => {
      setQueueSize(getOfflineQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offlineQueueUpdated', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offlineQueueUpdated', handleQueueUpdate);
    };
  }, [onSyncComplete]);

  return { isOffline, queueSize };
}


