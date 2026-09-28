import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { DEFAULT_DAILY_GOAL } from "@/lib/practice-config";
import { getUserTimezone, todayIn, getTopicAccuracy } from "@/lib/practice";

export type DashboardData = {
  name: string;
  goal: number;
  todayAnswered: number;
  todayRemaining: number;
  streak: { current: number; longest: number; activeDays: number };
  challenge: { done: boolean; correct: boolean | null };
  attempts: number;
  questionsAnswered: number;
  correctAnswers: number;
  averageScore: number | null;
  lastActivity: { title: string; when: Date; score: number; total: number } | null;
  weakTopics: Array<{ name: string; slug: string; accuracyPct: number }>;
  recent: Array<{
    id: string;
    title: string;
    topicName: string;
    score: number;
    total: number;
    when: Date;
  }>;
  plan: {
    isPremium: boolean;
    name: string | null;
    expiresAt: Date | null;
  };
  recommendations: Array<{ title: string; accuracyPct: number; reason: string }>;
};

/**
 * Everything the dashboard renders, in one pass so the page stays a thin
 * server component and the queries are not repeated per card.
 */
export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const user = await getCurrentUser();
  if (!user) throw new Error("getDashboardData requires a signed-in user");

  const timezone = await getUserTimezone(user.id);
  const today = todayIn(timezone);

  const [
    entitlement,
    settings,
    streakRow,
    activity,
    challengeAttempt,
    attempts,
    aggregate,
    lastAttempt,
    states,
  ] = await Promise.all([
    getEntitlement(),
    prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: { dailyGoal: true },
    }),
    prisma.userStreak.findUnique({
      where: { userId: user.id },
      select: { current: true, longest: true, activeDays: true },
    }),
    prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
      select: { questionsAnswered: true },
    }),
    prisma.dailyChallengeAttempt.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
      select: { isCorrect: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        score: true,
        total: true,
        createdAt: true,
        quiz: { select: { title: true, topic: { select: { name: true } } } },
      },
    }),
    prisma.userQuestionState.aggregate({
      where: { userId: user.id },
      _sum: { timesSeen: true, timesCorrect: true },
    }),
    prisma.quizAttempt.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        score: true,
        total: true,
        quiz: { select: { title: true } },
      },
    }),
    prisma.userQuestionState.count({ where: { userId: user.id, timesSeen: { gt: 0 } } }),
  ]);

  const goal = settings?.dailyGoal ?? DEFAULT_DAILY_GOAL;
  const todayAnswered = activity?.questionsAnswered ?? 0;
  const questionsAnswered = aggregate._sum.timesSeen ?? 0;
  const correctAnswers = aggregate._sum.timesCorrect ?? 0;

  // Weak topics drive both the recommendations and the Performance page.
  // Topics below the sample threshold are excluded: a single correct answer
  // reads as 100% accuracy and would be recommended back as a weak area.
  const accuracy = await getTopicAccuracy(user.id, 1);
  const weakTopics = accuracy
    .filter((topic) => topic.answered >= 5)
    .slice(0, 3)
    .map((topic) => ({
      name: topic.topicName,
      slug: topic.topicSlug,
      accuracyPct: Math.round(topic.accuracyBps / 100),
    }));

  // With no attempt history there is nothing to base a recommendation on, so
  // the UI shows its empty state instead of a guess.
  const recommendations =
    attempts.length >= 3
      ? weakTopics.map((topic) => ({
          title: topic.name,
          accuracyPct: topic.accuracyPct,
          reason: `Lowest accuracy so far`,
        }))
      : [];

  const first = attempts[0];

  return {
    name: user.name ?? user.email.split("@")[0] ?? "there",
    goal,
    todayAnswered,
    todayRemaining: Math.max(0, goal - todayAnswered),
    streak: streakRow ?? { current: 0, longest: 0, activeDays: 0 },
    challenge: {
      done: challengeAttempt !== null,
      correct: challengeAttempt?.isCorrect ?? null,
    },
    attempts: attempts.length,
    questionsAnswered,
    correctAnswers,
    averageScore:
      questionsAnswered > 0
        ? Math.round((correctAnswers / questionsAnswered) * 100)
        : null,
    lastActivity: lastAttempt
      ? {
          title: lastAttempt.quiz.title,
          when: lastAttempt.createdAt,
          score: lastAttempt.score,
          total: lastAttempt.total,
        }
      : null,
    weakTopics,
    recent: attempts.map((a) => ({
      id: a.id,
      title: a.quiz.title,
      topicName: a.quiz.topic.name,
      score: a.score,
      total: a.total,
      when: a.createdAt,
    })),
    plan: {
      isPremium: entitlement.isPremium,
      name: entitlement.planName,
      expiresAt: entitlement.expiresAt,
    },
    recommendations,
    // `states` is only used to distinguish a brand-new user from one who has
    // started; surfaced for the recommendation empty state.
    ...(states === 0 ? { isNewUser: true } : {}),
  } as DashboardData;
});

export type DashboardStat = {
  label: string;
  value: string;
  hint?: string;
  percentage?: number;
};
