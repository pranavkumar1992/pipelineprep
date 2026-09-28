import "server-only";

/**
 * Fixed-window rate limiter backed by process memory.
 *
 * Scope: single-instance deployments (the target for this release). State is
 * per-process, so horizontal scaling would need the Redis implementation in
 * `redis-limiter.ts`; keep this as the default until then.
 *
 * Auth endpoints are additionally protected by per-account and per-email
 * limits in Postgres (see `auth-lockout.ts`), which do not reset on restart.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Keeps the map from growing without bound on a long-lived process. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return {
      ok: true,
      remaining: limit - 1,
      retryAfter: windowSeconds,
    };
  }

  existing.count += 1;
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfter,
  };
}

/** Clears a bucket, e.g. after a successful login. */
export function resetLimit(key: string): void {
  buckets.delete(key);
}

export const LIMITS = {
  login: { limit: 8, window: 15 * 60 },
  signup: { limit: 5, window: 60 * 60 },
  forgotPassword: { limit: 4, window: 60 * 60 },
  contact: { limit: 3, window: 60 * 60 },
  quizSubmit: { limit: 120, window: 60 },
  scenarioStep: { limit: 400, window: 60 },
  checkout: { limit: 10, window: 10 * 60 },
} as const;
