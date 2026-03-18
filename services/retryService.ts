/**
 * Retry Service for Production-Grade Error recovery
 * Implements exponential backoff with jitter for transient failure recovery
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  shouldRetry: (error: any) => {
    // Don't retry on client errors (4xx) or abort errors
    if (error.status && error.status >= 400 && error.status < 500) return false;
    if (error.name === 'AbortError') return false;
    // Retry on network errors, 5xx, and timeouts
    return true;
  }
};

/**
 * Execute a function with exponential backoff retry
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Promise with result or final error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error indicates we shouldn't
      if (!config.shouldRetry(error)) {
        throw error;
      }

      // Last attempt - throw
      if (attempt === config.maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = config.initialDelayMs * Math.pow(
        config.backoffMultiplier,
        attempt - 1
      );
      const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
      const jitter = cappedDelay * config.jitterFactor * Math.random();
      const delayMs = cappedDelay + jitter;

      console.warn(
        `[Retry] Attempt ${attempt}/${config.maxAttempts} failed, retrying in ${Math.round(delayMs)}ms:`,
        error.message
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Retry with specific HTTP error handling
 */
export async function withHttpRetry<T>(
  fn: () => Promise<Response>,
  onSuccess: (response: Response) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return withRetry(async () => {
    const response = await fn();

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    return onSuccess(response);
  }, config);
}

/**
 * Retry with timeout protection
 */
export async function withTimeoutRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 10000,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(
    () =>
      Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
            timeoutMs
          )
        )
      ]),
    options
  );
}


