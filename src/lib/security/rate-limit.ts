export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 5000;

/**
 * Cleans up expired buckets to prevent memory bloat in long-running processes.
 */
function pruneExpiredBuckets(now: number) {
  if (rateLimitStore.size < MAX_BUCKETS) return;
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Evaluates a fixed/sliding window rate limit for a given identifier.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 10, windowMs: 60_000 },
  nowOverride?: number
): RateLimitResult {
  const now = nowOverride ?? Date.now();
  pruneExpiredBuckets(now);

  const existing = rateLimitStore.get(identifier);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      remaining: Math.max(0, options.maxRequests - 1),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= options.maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, options.maxRequests - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Extracts a safe client identifier from request headers for rate limiting.
 */
export function getRequestClientIdentifier(
  request: Request,
  routeScope: string
): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const rawIp = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : realIp
    ? realIp.trim()
    : "127.0.0.1";

  return `${routeScope}:${rawIp}`;
}

/**
 * Clears all rate-limit buckets (used in automated test suites).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
