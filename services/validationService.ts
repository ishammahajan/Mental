/**
 * Data Validation & Sanitization Service
 * Ensures all user inputs are safe and valid before processing
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ─── Message Validation ────────────────────────────────────────────────
export function validateMessage(text: string, maxLength: number = 5000): ValidationResult {
  const errors: string[] = [];

  if (!text || typeof text !== 'string') {
    errors.push('Message must be a non-empty string');
    return { isValid: false, errors };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    errors.push('Message cannot be empty or whitespace only');
  }
  if (trimmed.length > maxLength) {
    errors.push(`Message cannot exceed ${maxLength} characters`);
  }

  // Basic XSS prevention - check for script tags
  if (/<script|on\w+\s*=/i.test(trimmed)) {
    errors.push('Message contains potentially harmful content');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ─── User ID Validation ────────────────────────────────────────────────
export function validateUserId(userId: string): ValidationResult {
  const errors: string[] = [];

  if (!userId || typeof userId !== 'string') {
    errors.push('User ID must be a non-empty string');
  } else if (userId.length > 255) {
    errors.push('User ID is too long');
  } else if (!/^[a-zA-Z0-9_@.\-]+$/.test(userId)) {
    errors.push('User ID contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ─── Email Validation ──────────────────────────────────────────────────
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email must be a non-empty string');
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    errors.push('Invalid email format');
  }

  if (email.length > 254) {
    errors.push('Email is too long');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ─── P2P Message Validation ────────────────────────────────────────────
export function validateP2PMessage(message: any): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!message.id || typeof message.id !== 'string') {
    errors.push('Message ID is required and must be a string');
  }

  if (!message.senderId || typeof message.senderId !== 'string') {
    errors.push('Sender ID is required');
  } else {
    const senderValidation = validateUserId(message.senderId);
    if (!senderValidation.isValid) {
      errors.push(`Sender ID invalid: ${senderValidation.errors[0]}`);
    }
  }

  if (!message.receiverId || typeof message.receiverId !== 'string') {
    errors.push('Receiver ID is required');
  } else if (message.receiverId === message.senderId) {
    errors.push('Cannot send message to yourself');
  }

  if (!message.text || typeof message.text !== 'string') {
    errors.push('Message text is required');
  } else {
    const textValidation = validateMessage(message.text);
    if (!textValidation.isValid) {
      errors.push(...textValidation.errors);
    }
  }

  if (!message.timestamp || typeof message.timestamp !== 'string') {
    errors.push('Message timestamp is required');
  } else {
    try {
      new Date(message.timestamp);
    } catch {
      errors.push('Invalid timestamp format');
    }
  }

  if (typeof message.isRead !== 'boolean') {
    errors.push('isRead must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ─── Sanitization ─────────────────────────────────────────────────────
/**
 * Removes potentially harmful HTML and special characters
 */
export function sanitizeMessage(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove other HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

  return sanitized.trim();
}

/**
 * Validate and sanitize message in one call
 */
export function validateAndSanitizeMessage(
  text: string,
  maxLength: number = 5000
): { isValid: boolean; errors: string[]; sanitized: string } {
  const validation = validateMessage(text, maxLength);
  return {
    ...validation,
    sanitized: validation.isValid ? sanitizeMessage(text) : ''
  };
}

// ─── Task Validation ──────────────────────────────────────────────────
export function validateTask(task: any): ValidationResult {
  const errors: string[] = [];

  if (!task.id || typeof task.id !== 'string') {
    errors.push('Task ID is required');
  }

  if (!task.title || typeof task.title !== 'string' || task.title.trim().length === 0) {
    errors.push('Task title is required');
  } else if (task.title.length > 200) {
    errors.push('Task title is too long (max 200 characters)');
  }

  if (task.description && typeof task.description !== 'string') {
    errors.push('Task description must be a string');
  }

  if (typeof task.isCompleted !== 'boolean') {
    errors.push('Task completion status must be a boolean');
  }

  if (task.assignedBy && typeof task.assignedBy !== 'string') {
    errors.push('Assigned by must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ─── Batch Validation ──────────────────────────────────────────────────
export function validateBatch<T>(
  items: T[],
  validator: (item: T) => ValidationResult
): { validItems: T[]; invalidItems: Array<{ item: T; errors: string[] }> } {
  const validItems: T[] = [];
  const invalidItems: Array<{ item: T; errors: string[] }> = [];

  items.forEach(item => {
    const result = validator(item);
    if (result.isValid) {
      validItems.push(item);
    } else {
      invalidItems.push({ item, errors: result.errors });
    }
  });

  return { validItems, invalidItems };
}
