/**
 * Sequential retry with exponential backoff and jitter.
 * Designed for payment operations where parallel retries are unsafe.
 */
export interface RetryOptions<T> {
  /** Maximum number of retries (default: 3). Total attempts = maxRetries + 1. */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 500). */
  baseDelayMs?: number;
  /** Predicate: return true if the result is retryable. */
  shouldRetry: (result: T) => boolean;
  /** Called before each retry with the attempt number (1-indexed) and the previous result. */
  onRetry?: (attempt: number, previousResult: T) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions<T>,
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;

  let result = await fn();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (!options.shouldRetry(result)) {
      return result;
    }

    options.onRetry?.(attempt, result);

    // Exponential backoff with jitter: baseDelay * 2^(attempt-1) * [0.5, 1.5)
    const delayMs = baseDelayMs * Math.pow(2, attempt - 1) * (0.5 + Math.random());
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    result = await fn();
  }

  return result;
}
