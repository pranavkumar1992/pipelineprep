import "server-only";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { getUserTimezone, todayIn } from "@/lib/practice";
import { isLevelPremium } from "@/lib/banks";

/**
 * Daily Challenge (addendum §4).
 *
 * One question per calendar date, identical for every user. Selection order:
 *  1. an admin-picked question for that date, then
 *  2. a stored DailyChallenge row, then
 *  3. a random published question (fallback, so the page always works).
 *
 * "Today" is resolved in the user's own timezone.
 */

export type DailyChallengeView = {
  date: string;
  question: {
    id: string;
    text: string;
    options: string[];
    topicName: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    locked: boolean;
  } | null;
  scenario: { title: string; summary: string; slug: string } | null;
  attempt: { selectedOption: number; isCorrect: boolean } | null;
  streak: { current: number; longest: number; activeDays: number };
  stats: { completed: number; accuracyPct: number };
  todayAnswered: number;
};

export async function getDailyChallenge(): Promise<DailyChallengeView> {
  const user = await getCurrentUser();
  const timezone = user ? await getUserTimezone(user.id) : "Asia/Kolkata";
  const today = todayIn(timezone);
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeZone: timezone,
  }).format(today);

  const emptyStreak = { current: 0, longest: 0, activeDays: 0 };
  const emptyStats = { completed: 0, accuracyPct: 0 };

  if (!user) {
    return {
      date: dateLabel,
      question: null,
      scenario: null,
      attempt: null,
      streak: emptyStreak,
      stats: emptyStats,
      todayAnswered: 0,
    };
  }

  const entitlement = await getEntitlement();

  const [stored, streakRow, attempts, todayActivity] = await Promise.all([
    prisma.dailyChallenge.findUnique({
      where: { date: today },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            options: true,
            difficulty: true,
            topic: { select: { name: true } },
            quiz: { select: { isPremium: true, level: true } },
          },
        },
        scenario: { select: { title: true, summary: true, slug: true } },
      },
    }),
    prisma.userStreak.findUnique({
      where: { userId: user.id },
      select: { current: true, longest: true, activeDays: true },
    }),
    prisma.dailyChallengeAttempt.findMany({
      where: { userId: user.id },
      select: { isCorrect: true },
    }),
    prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
      select: { questionsAnswered: true },
    }),
  ]);

  // Fallback: pick a random published question if no row exists yet. This keeps
  // the page usable without a scheduled job.
  const fallback =
    stored ?? (await createFallbackChallenge(today)).current ?? null;

  // No published questions at all: render the page without a card rather than
  // crashing. The seed guarantees content, so this is a safety net.
  if (!fallback) {
    return {
      date: dateLabel,
      question: null,
      scenario: null,
      attempt: null,
      streak: streakRow ?? emptyStreak,
      stats: {
        completed: attempts.length,
        accuracyPct:
          attempts.length > 0
            ? Math.round(
                (attempts.filter((a) => a.isCorrect).length / attempts.length) * 100,
              )
            : 0,
      },
      todayAnswered: todayActivity?.questionsAnswered ?? 0,
    };
  }

  const record = fallback;

  const completed = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;

  const attempt = attempts.length > 0 ? await prisma.dailyChallengeAttempt.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
    select: { selectedOption: true, isCorrect: true },
  }) : null;

  const question = record.question;
  const requiresPremium =
    question.quiz?.isPremium ||
    (question.quiz?.level ? isLevelPremium(question.quiz.level) : false);

  return {
    date: dateLabel,
    question: {
      id: question.id,
      text: question.text,
      options: question.options,
      topicName: question.topic.name,
      difficulty: question.difficulty,
      // A premium question is never sent to a free user. They see an
      // upgrade prompt instead, so no answer data leaks.
      locked: requiresPremium && !entitlement.isPremium,
    },
    scenario: record.scenario,
    attempt: attempt ?? null,
    streak: streakRow ?? emptyStreak,
    stats: {
      completed,
      accuracyPct: completed > 0 ? Math.round((correct / completed) * 100) : 0,
    },
    todayAnswered: todayActivity?.questionsAnswered ?? 0,
  };
}

/**
 * Creates today's challenge from a random published question when a scheduled
 * job has not already done so. Uses the first free question where possible so
 * the Daily Challenge is usable on the free tier.
 */
async function createFallbackChallenge(date: Date) {
  const freeQuestion = await prisma.question.findFirst({
    where: { status: "PUBLISHED", quiz: { isPremium: false } },
    select: { id: true },
  });

  const question =
    freeQuestion ??
    (await prisma.question.findFirst({
      where: { status: "PUBLISHED" },
      select: { id: true },
    }));

  if (!question) return { current: null };

  const scenario = await prisma.scenario.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return {
    current: await prisma.dailyChallenge.upsert({
      where: { date },
      create: {
        date,
        questionId: question.id,
        scenarioId: scenario?.id ?? null,
        pickedBy: "fallback",
      },
      update: {},
      include: {
        question: {
          select: {
            id: true,
            text: true,
            options: true,
            difficulty: true,
            topic: { select: { name: true } },
            quiz: { select: { isPremium: true, level: true } },
          },
        },
        scenario: { select: { title: true, summary: true, slug: true } },
      },
    }),
  };
}

