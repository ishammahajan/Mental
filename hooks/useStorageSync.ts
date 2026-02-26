import { useEffect, useCallback } from 'react';

/**
 * useStorageSync — Real-time sync via BroadcastChannel API.
 *
 * Unlike the native `window.storage` event (which only fires in OTHER tabs),
 * BroadcastChannel fires in ALL tabs including the one that made the write.
 * This means student and counselor on the same machine see changes instantly.
 *
 * The `speakup_sync` channel is written to by `cloudSet` in storage.ts.
 */
export const SYNC_KEYS = [
    'speakup_cloud_slots',
    'speakup_cloud_tasks',
    'speakup_cloud_p2p',
    'speakup_cloud_posts',
    'speakup_cloud_chat',
    'speakup_cloud_consent',
];

export const useStorageSync = (
    onSync: (changedKey: string) => void,
    watchKeys: string[] = SYNC_KEYS
) => {
    const stableOnSync = useCallback(onSync, []);

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;

        const channel = new BroadcastChannel('speakup_sync');

        channel.onmessage = (e: MessageEvent<{ key: string }>) => {
            const { key } = e.data || {};
            if (!key) return;
            const matched = watchKeys.some(wk => key.startsWith(wk));
            if (matched) stableOnSync(key);
        };

        return () => channel.close();
    }, [stableOnSync]);
};
