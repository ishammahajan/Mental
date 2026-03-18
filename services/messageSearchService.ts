/**
 * Message Search & Filtering Service
 * Enables searching and filtering chat messages
 */

import { P2PMessage, Message } from '../types';

export interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  maxResults?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Search P2P messages by text content
 */
export function searchP2PMessages(
  messages: P2PMessage[],
  options: SearchOptions
): P2PMessage[] {
  const {
    query,
    caseSensitive = false,
    maxResults = 50,
    startDate,
    endDate
  } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = caseSensitive ? query : query.toLowerCase();

  return messages
    .filter(msg => {
      // Text match
      const messageText = caseSensitive ? msg.text : msg.text.toLowerCase();
      if (!messageText.includes(searchTerm)) {
        return false;
      }

      // Date range filter
      const msgDate = new Date(msg.timestamp);
      if (startDate && msgDate < startDate) return false;
      if (endDate && msgDate > endDate) return false;

      return true;
    })
    .slice(-maxResults);
}

/**
 * Search chat messages (AI conversation history)
 */
export function searchChatMessages(
  messages: Message[],
  options: SearchOptions
): Message[] {
  const {
    query,
    caseSensitive = false,
    maxResults = 50,
    startDate,
    endDate
  } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = caseSensitive ? query : query.toLowerCase();

  return messages
    .filter(msg => {
      // Text match
      const messageText = caseSensitive ? msg.text : msg.text.toLowerCase();
      if (!messageText.includes(searchTerm)) {
        return false;
      }

      // Date range filter
      if (startDate && msg.timestamp < startDate) return false;
      if (endDate && msg.timestamp > endDate) return false;

      return true;
    })
    .slice(-maxResults);
}

/**
 * Filter messages by sender
 */
export function filterMessagesBySender(
  messages: P2PMessage[],
  senderId: string
): P2PMessage[] {
  return messages.filter(m => m.senderId === senderId);
}

/**
 * Filter unread messages
 */
export function getUnreadMessages(
  messages: P2PMessage[],
  receiverId: string
): P2PMessage[] {
  return messages.filter(m => m.receiverId === receiverId && !m.isRead);
}

/**
 * Group messages by date
 */
export function groupMessagesByDate(
  messages: P2PMessage[]
): Map<string, P2PMessage[]> {
  const grouped = new Map<string, P2PMessage[]>();

  messages.forEach(msg => {
    const date = new Date(msg.timestamp);
    const dateKey = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(msg);
  });

  return grouped;
}

/**
 * Get message statistics
 */
export function getMessageStats(messages: P2PMessage[]) {
  const stats = {
    totalMessages: messages.length,
    unreadCount: 0,
    senderCounts: new Map<string, number>(),
    dateRange: { earliest: null as Date | null, latest: null as Date | null }
  };

  messages.forEach(msg => {
    if (!msg.isRead) stats.unreadCount++;

    const count = stats.senderCounts.get(msg.senderId) || 0;
    stats.senderCounts.set(msg.senderId, count + 1);

    const msgDate = new Date(msg.timestamp);
    if (!stats.dateRange.earliest || msgDate < stats.dateRange.earliest) {
      stats.dateRange.earliest = msgDate;
    }
    if (!stats.dateRange.latest || msgDate > stats.dateRange.latest) {
      stats.dateRange.latest = msgDate;
    }
  });

  return stats;
}

/**
 * Export messages to text format
 */
export function exportMessagesToText(
  messages: P2PMessage[],
  senderName: string = 'Unknown'
): string {
  const lines: string[] = [
    `Chat Export - ${new Date().toLocaleString()}`,
    `Total Messages: ${messages.length}`,
    '─'.repeat(50),
    ''
  ];

  messages.forEach(msg => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const sender = msg.senderId === senderName ? 'You' : senderName;
    lines.push(`[${time}] ${sender}: ${msg.text}`);
  });

  return lines.join('\n');
}


