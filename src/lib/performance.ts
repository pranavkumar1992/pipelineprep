import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getTopicAccuracy } from "@/lib/practice";

/**
 * Minimum answers in a topic before it is treated as a weak area.
 *
 * One right answer is 100% accuracy and would otherwise be listed as the
 * strongest and weakest topic at once.
 */
const WEAK_AREA_MIN_ANSWERS = 5;

export type PerformanceData = {
  overall: {
    answered: number;
    correct: number;
    accuracyPct: number | null;
    mastered: number;
    bookmarks: number;
    hardMarked: number;
  };
  byTopic: Array<{
    name: string;
    slug: string;
    answered: number;
    correct: number;
    accuracyPct: number;
  }>;
  weakAreas: Array<{ name: string; slug: string; accuracyPct: number; answered: number }>;
  /** Score trend, oldest first, for the line chart. */
  trend: Array<{ when: Date; percentage: number; title: string }>;
  timeSpentSec: number;
  attempts: number;
  /** Last 30 days of answered counts, for the activity strip. */
  activity: Array<{ date: string; count: number }>;
};

export const getPerformanceData = cache(
  async (): Promise<PerformanceData> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("getPerformanceData requires a signed-in user");

    const [aggregate, stateCounts, attempts, accuracy, activity] =
      await Promise.all([
        prisma.userQuestionState.aggregate({
          where: { userId: user.id },
          _sum: { timesSeen: true, timesCorrect: true },
        }),
        prisma.userQuestionState.groupBy({
          by: ["mastered", "isBookmarked", "isHard"],
          where: { userId: user.id },
          _count: { _all: true },
        }),
        prisma.quizAttempt.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
          take: 40,
          select: {
            createdAt: true,
            score: true,
            total: true,
            duration: true,
            quiz: { select: { title: true } },
          },
        }),
        getTopicAccuracy(user.id, 1),
        prisma.dailyActivity.findMany({
          where: { userId: user.id },
          orderBy: { date: "desc" },
          take: 30,
          select: { date: true, questionsAnswered: true },
        }),
      ]);

    const answered = aggregate._sum.timesSeen ?? 0;
    const correct = aggregate._sum.timesCorrect ?? 0;

    let mastered = 0;
    let bookmarks = 0;
    let hardMarked = 0;
    for (const row of stateCounts) {
      if (row.mastered) mastered += row._count._all;
      if (row.isBookmarked) bookmarks += row._count._all;
      if (row.isHard) hardMarked += row._count._all;
    }

    // Reverse so the trend reads oldest-first for the chart.
    const activityAsc = [...activity].reverse();

    return {
      overall: {
        answered,
        correct,
        accuracyPct: answered > 0 ? Math.round((correct / answered) * 100) : null,
        mastered,
        bookmarks,
        hardMarked,
      },
      byTopic: accuracy.map((topic) => ({
        name: topic.topicName,
        slug: topic.topicSlug,
        answered: topic.answered,
        correct: topic.correct,
        accuracyPct: Math.round(topic.accuracyBps / 100),
      })),
      /**
       * Weak areas only consider topics with enough answers to mean anything.
       * Ranking purely on accuracy put a topic answered once and answered
       * correctly at the top of a list called "weak areas", which is misleading
       * rather than useful. Configurable rather than hardcoded so the threshold
       * can be tuned once there is real traffic data.
       */
      weakAreas: accuracy
        .filter((topic) => topic.answered >= WEAK_AREA_MIN_ANSWERS)
        .slice(0, 5)
        .map((topic) => ({
          name: topic.topicName,
          slug: topic.topicSlug,
          accuracyPct: Math.round(topic.accuracyBps / 100),
          answered: topic.answered,
        })),
      trend: attempts.map((attempt) => ({
        when: attempt.createdAt,
        percentage:
          attempt.total > 0
            ? Math.round((attempt.score / attempt.total) * 100)
            : 0,
        title: attempt.quiz.title,
      })),
      timeSpentSec: attempts.reduce((sum, a) => sum + a.duration, 0),
      attempts: attempts.length,
      activity: activityAsc.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        count: row.questionsAnswered,
      })),
    };
  },
);
