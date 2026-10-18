/** Wait before the first reconnect attempt, in milliseconds. Each failed attempt doubles it. */
export const RETRY_FIRST_MS = 500;

/** Never wait longer than this between attempts. */
export const RETRY_MAX_MS = 8000;

/** How long to wait before reconnect attempt number `attempt` (0 for the first). */
export function retryDelay(attempt: number): number {
  return Math.min(RETRY_FIRST_MS * 2 ** Math.max(0, attempt), RETRY_MAX_MS);
}
