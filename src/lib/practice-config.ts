/**
 * Practice configuration (addendum §6: make these configurable rather than
 * hardcoded). Each value maps to a rule stated in the addendum.
 */

/** Questions drawn per attempt, capped by bank size (addendum §3). */
export const QUESTIONS_PER_ATTEMPT = 20;

/** Quick Practice draws this many, no setup (addendum §2A.4). */
export const QUICK_PRACTICE_QUESTIONS = 7;

/**
 * Consecutive correct answers needed to mark a question mastered (addendum §3).
 */
export const MASTERED_STREAK = 2;

/** Default daily goal; users can override it in settings (addendum §5.3). */
export const DEFAULT_DAILY_GOAL = 10;

/** Mock test countdown in seconds (addendum §2A.5). */
export const MOCK_TEST_SECONDS = 20 * 60;

/** Rate limits for answer submission and mode start, per IP. */
export const ANSWER_RATE_LIMIT = { limit: 240, windowSeconds: 60 };
export const START_RATE_LIMIT = { limit: 30, windowSeconds: 300 };
