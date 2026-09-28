import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { getSession } from "@/lib/auth/session";
import { MASTERED_STREAK } from "@/lib/practice-config";

/**
 * Per-user question state (addendum §3).
 *
 * Central helpers for "seen" and "mastered". Every answered question goes
 * through `recordAnswer` so the counts cannot drift, and the bank grid reads
 * from the same rows, which is what keeps "X / N seen" consistent after every
 * answer.
 */

export type QuestionStateMap = Map<
  string,
  {
    timesSeen: number;
    timesCorrect: number;
    isBookmarked: boolean;
    isHard: boolean;
    mastered: boolean;
  }
>;

/** Loads state for a set of questions in one query. */
export async function loadQuestionStates(
  userId: string,
  questionIds: string[],
): Promise<QuestionStateMap> {
  const map: QuestionStateMap = new Map();
  if (questionIds.length === 0) return map;

  const rows = await prisma.userQuestionState.findMany({
    where: { userId, questionId: { in: questionIds } },
    select: {
      questionId: true,
      timesSeen: true,
      timesCorrect: true,
      isBookmarked: true,
      isHard: true,
      mastered: true,
    },
  });

  for (const row of rows) map.set(row.questionId, row);
  return map;
}

/** Aggregated seen/mastered counts per quiz bank. */
export type BankProgress = {
  seen: number;
  mastered: number;
  total: number;
};

export async function loadBankProgress(
  userId: string,
): Promise<Map<string, BankProgress>> {
  const banks = await prisma.quiz.findMany({
    where: { status: "PUBLISHED", level: { not: null } },
    select: {
      id: true,
      _count: { select: { questions: { where: { status: "PUBLISHED" } } } },
    },
  });

  const totals = new Map<string, BankProgress>();
  for (const bank of banks) {
    totals.set(bank.id, {
      seen: 0,
      mastered: 0,
      total: bank._count.questions,
    });
  }
  if (totals.size === 0) return totals;

  // Group state by the question's bank so we can aggregate in one pass.
  const rows = await prisma.userQuestionState.findMany({
    where: { userId, question: { status: "PUBLISHED" } },
    select: {
      timesSeen: true,
      mastered: true,
      question: { select: { quizId: true } },
    },
  });

  for (const row of rows) {
    if (!row.question.quizId) continue;
    const entry = totals.get(row.question.quizId);
    if (!entry) continue;
    if (row.timesSeen > 0) entry.seen += 1;
    if (row.mastered) entry.mastered += 1;
  }

  return totals;
}

/**
 * Records one answered question and updates derived state.
 *
 * `mastered` becomes true once the user answers correctly
 * `MASTERED_STREAK` times in a row; any incorrect answer resets the run.
 */
export async function recordAnswer(input: {
  userId: string;
  questionId: string;
  isCorrect: boolean;
}): Promise<void> {
  const existing = await prisma.userQuestionState.findUnique({
    where: {
      userId_questionId: {
        userId: input.userId,
        questionId: input.questionId,
      },
    },
    select: { consecutiveCorrect: true },
  });

  const previous = existing?.consecutiveCorrect ?? 0;
  const consecutiveCorrect = input.isCorrect ? previous + 1 : 0;
  const mastered = consecutiveCorrect >= MASTERED_STREAK;

  await prisma.userQuestionState.upsert({
    where: {
      userId_questionId: {
        userId: input.userId,
        questionId: input.questionId,
      },
    },
    create: {
      userId: input.userId,
      questionId: input.questionId,
      timesSeen: 1,
      timesCorrect: input.isCorrect ? 1 : 0,
      consecutiveCorrect,
      lastAnsweredAt: new Date(),
      mastered,
    },
    update: {
      timesSeen: { increment: 1 },
      timesCorrect: input.isCorrect ? { increment: 1 } : { increment: 0 },
      consecutiveCorrect,
      lastAnsweredAt: new Date(),
      // Once mastered, stays mastered even if the user slips up later.
      ...(mastered ? { mastered: true } : {}),
    },
  });

  await incrementDailyActivity(input.userId, 1);
}

/** Marks a question as bookmarked or hard. Feeds Revision mode. */
export async function setQuestionFlag(input: {
  userId: string;
  questionId: string;
  isBookmarked?: boolean;
  isHard?: boolean;
}): Promise<void> {
  await prisma.userQuestionState.upsert({
    where: {
      userId_questionId: {
        userId: input.userId,
        questionId: input.questionId,
      },
    },
    create: {
      userId: input.userId,
      questionId: input.questionId,
      ...(input.isBookmarked !== undefined
        ? { isBookmarked: input.isBookmarked }
        : {}),
      ...(input.isHard !== undefined ? { isHard: input.isHard } : {}),
    },
    update: {
      ...(input.isBookmarked !== undefined
        ? { isBookmarked: input.isBookmarked }
        : {}),
      ...(input.isHard !== undefined ? { isHard: input.isHard } : {}),
    },
  });
}

/** Increments today's activity counter in the user's timezone. */
export async function incrementDailyActivity(
  userId: string,
  by: number,
): Promise<void> {
  const timezone = await getUserTimezone(userId);
  const today = todayIn(timezone);

  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, questionsAnswered: by },
    update: { questionsAnswered: { increment: by } },
  });
}

/** Reads the stored timezone, falling back to the default. */
export async function getUserTimezone(userId: string): Promise<string> {
  const row = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  if (row?.timezone && isValidTimezone(row.timezone)) return row.timezone;

  // Fall back to the browser-reported zone, which we cache on first write.
  return row?.timezone ?? DEFAULT_TIMEZONE;
}

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * The calendar date in a given timezone, as a UTC-midnight Date so it can be
 * stored in a `@db.Date` column and compared with equality.
 */
export function todayIn(timezone: string): Date {
  const now = new Date();
  // en-CA formats as YYYY-MM-DD, which parses as a plain date.
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${ymd}T00:00:00.000Z`);
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

/** Whole days between two @db.Date values. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Weak-topic detection (Focus Areas mode)
// ---------------------------------------------------------------------------

export type TopicAccuracy = {
  topicId: string;
  topicSlug: string;
  topicName: string;
  answered: number;
  correct: number;
  accuracyBps: number;
};

/** Per-topic accuracy from answer history, lowest first. */
export const getTopicAccuracy = cache(
  async (userId: string, minAnswered = 3): Promise<TopicAccuracy[]> => {
    const states = await prisma.userQuestionState.findMany({
      where: { userId, timesSeen: { gt: 0 } },
      select: {
        timesSeen: true,
        timesCorrect: true,
        question: {
          select: { topic: { select: { id: true, slug: true, name: true } } },
        },
      },
    });

    const buckets = new Map<
      string,
      { topicId: string; topicSlug: string; topicName: string; answered: number; correct: number }
    >();

    for (const state of states) {
      const topic = state.question.topic;
      const bucket = buckets.get(topic.id) ?? {
        topicId: topic.id,
        topicSlug: topic.slug,
        topicName: topic.name,
        answered: 0,
        correct: 0,
      };
      bucket.answered += state.timesSeen;
      bucket.correct += state.timesCorrect;
      buckets.set(topic.id, bucket);
    }

    return [...buckets.values()]
      .filter((b) => b.answered >= minAnswered)
      .map((b) => ({
        ...b,
        accuracyBps: b.answered ? Math.round((b.correct / b.answered) * 10000) : 0,
      }))
      .sort((a, b) => a.accuracyBps - b.accuracyBps);
  },
);

// ---------------------------------------------------------------------------
// Streaks (addendum §6)
// ---------------------------------------------------------------------------

/**
 * Records that a day is active and updates the streak.
 *
 * A day is active if the user completes the Daily Challenge or reaches their
 * daily goal. Calling this more than once in a day is a no-op beyond the first
 * activation, so streaks cannot inflate.
 */
export async function markDayActive(userId: string): Promise<void> {
  const timezone = await getUserTimezone(userId);
  const today = todayIn(timezone);

  const existing = await prisma.userStreak.findUnique({
    where: { userId },
    select: { current: true, longest: true, activeDays: true, lastActiveDate: true },
  });

  if (!existing) {
    await prisma.userStreak.create({
      data: {
        userId,
        current: 1,
        longest: 1,
        activeDays: 1,
        lastActiveDate: today,
      },
    });
    return;
  }

  // Already activated today: nothing to change.
  if (existing.lastActiveDate && daysBetween(today, existing.lastActiveDate) === 0) {
    return;
  }

  let current: number;
  if (
    existing.lastActiveDate &&
    daysBetween(today, existing.lastActiveDate) === 1
  ) {
    // Consecutive day.
    current = existing.current + 1;
  } else {
    // Missed at least one day: reset.
    current = 1;
  }

  await prisma.userStreak.update({
    where: { userId },
    data: {
      current,
      longest: Math.max(existing.longest, current),
      activeDays: existing.activeDays + 1,
      lastActiveDate: today,
    },
  });
}

/** True when the user has met their daily goal for today. */
export async function hasHitDailyGoal(userId: string): Promise<boolean> {
  const timezone = await getUserTimezone(userId);
  const today = todayIn(timezone);

  const [activity, settings] = await Promise.all([
    prisma.dailyActivity.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { questionsAnswered: true },
    }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { dailyGoal: true },
    }),
  ]);

  const goal = settings?.dailyGoal ?? 10;
  return (activity?.questionsAnswered ?? 0) >= goal;
}

// ---------------------------------------------------------------------------
// Entitlement-aware helper for mode cards
// ---------------------------------------------------------------------------

export const getPracticeContext = cache(async () => {
  const [user, session, entitlement] = await Promise.all([
    getCurrentUser(),
    getSession(),
    getEntitlement(),
  ]);
  return { user, session, isPremium: entitlement.isPremium };
});
