/**
 * Message Pagination & Performance Optimization Service
 * Enables efficient loading and rendering of large message lists
 */

import { P2PMessage, Message } from '../types';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface PaginatedMessages<T> {
  items: T[];
  pagination: PaginationState;
}

/**
 * Paginate messages - load messages in chunks instead of all at once
 */
export function paginateMessages<T extends P2PMessage | Message>(
  allMessages: T[],
  pageNumber: number = 1,
  pageSize: number = 50
): PaginatedMessages<T> {
  const totalCount = allMessages.length;
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const items = allMessages.slice(startIndex, endIndex);
  const hasMore = endIndex < totalCount;

  return {
    items,
    pagination: {
      currentPage: pageNumber,
      pageSize,
      totalCount,
      hasMore
    }
  };
}

/**
 * Load more messages (pagination backward compatibility)
 */
export function loadMoreMessages<T extends P2PMessage | Message>(
  allMessages: T[],
  currentItems: T[],
  pageSize: number = 50
): { items: T[]; hasMore: boolean } {
  const currentLastId = currentItems[currentItems.length - 1]?.id;
  const currentLastIndex = allMessages.findIndex(m => m.id === currentLastId);

  if (currentLastIndex === -1) {
    return { items: [], hasMore: false };
  }

  const nextIndex = Math.min(currentLastIndex + pageSize, allMessages.length);
  const newItems = allMessages.slice(currentLastIndex + 1, nextIndex);
  const hasMore = nextIndex < allMessages.length;

  return {
    items: newItems,
    hasMore
  };
}

/**
 * Virtual scroll optimization - only render visible items
 * Returns indices for rendering
 */
export function getVisibleRange(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  bufferItems: number = 5
): { startIndex: number; endIndex: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItems);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(itemCount, startIndex + visibleCount + bufferItems * 2);

  return { startIndex, endIndex };
}

/**
 * Deduplicate messages (removes duplicates that may occur during sync)
 */
export function deduplicateMessages<T extends { id: string }>(messages: T[]): T[] {
  const seen = new Set<string>();
  return messages.filter(msg => {
    if (seen.has(msg.id)) {
      return false;
    }
    seen.add(msg.id);
    return true;
  });
}

/**
 * Sort messages chronologically
 */
export function sortMessages<T extends P2PMessage | Message>(
  messages: T[],
  ascending: boolean = true
): T[] {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return ascending ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Chunk messages for batch processing
 */
export function chunkMessages<T extends { id: string }>(
  messages: T[],
  chunkSize: number = 10
): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < messages.length; i += chunkSize) {
    chunks.push(messages.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Estimate memory usage of message list
 */
export function estimateMessageMemory(messages: any[]): {
  estimatedBytes: number;
  estimatedKB: number;
} {
  let bytes = 0;

  messages.forEach(msg => {
    bytes += 16; // ID string (UUID ~36 chars)
    bytes += msg.text?.length || 0;
    bytes += 50; // Metadata (timestamps, sender/receiver IDs)
  });

  return {
    estimatedBytes: bytes,
    estimatedKB: Math.round(bytes / 1024 * 100) / 100
  };
}

/**
 * Compress message list for storage
 * Removes low-value metadata to reduce size
 */
export function compressMessages(
  messages: P2PMessage[]
): Array<{
  id: string;
  s: string;
  r: string;
  t: string;
  ts: string;
}> {
  return messages.map(m => ({
    id: m.id,
    s: m.senderId,
    r: m.receiverId,
    t: m.text,
    ts: m.timestamp
  }));
}

/**
 * Decompress messages
 */
export function decompressMessages(
  compressed: Array<{
    id: string;
    s: string;
    r: string;
    t: string;
    ts: string;
  }>
): P2PMessage[] {
  return compressed.map(m => ({
    id: m.id,
    senderId: m.s,
    receiverId: m.r,
    text: m.t,
    timestamp: m.ts,
    isRead: false
  }));
}

/**
 * Archive old messages (keep recent messages, archive the rest)
 * Returns messages to archive and messages to keep
 */
export function archiveOldMessages(
  messages: P2PMessage[],
  daysToKeep: number = 90
): {
  recent: P2PMessage[];
  archived: P2PMessage[];
} {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const recent: P2PMessage[] = [];
  const archived: P2PMessage[] = [];

  messages.forEach(msg => {
    if (new Date(msg.timestamp) > cutoffDate) {
      recent.push(msg);
    } else {
      archived.push(msg);
    }
  });

  return { recent, archived };
}

/**
 * Batch mark messages as read (more efficient than individual calls)
 */
export function getBatchMarkReadStats(
  messages: P2PMessage[],
  receiverId: string
): { count: number; senderIds: Set<string> } {
  const unreadFromSenders = new Set<string>();
  let count = 0;

  messages.forEach(msg => {
    if (msg.receiverId === receiverId && !msg.isRead) {
      count++;
      unreadFromSenders.add(msg.senderId);
    }
  });

  return {
    count,
    senderIds: unreadFromSenders
  };
}
