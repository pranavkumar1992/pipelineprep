import "server-only";
import { cache } from "react";
import type { Difficulty, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Content access rules (P-1).
 *
 * A visitor (not signed in) can browse the catalogue but cannot play anything.
 * A signed-in free user can play content flagged `isPremium: false`.
 * A premium user (or admin) can play everything published.
 *
 * Correct answers are NEVER included in these query results. Grading happens in
 * `src/app/actions/quiz.ts` so the answer key never reaches an unauthorised
 * client, per the content-protection requirement.
 */

export type PublicQuiz = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: Difficulty;
  isPremium: boolean;
  tags: string[];
  timeLimitSec: number | null;
  topic: { name: string; slug: string; icon: string };
  questionCount: number;
};

export type PublicScenario = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  difficulty: Difficulty;
  isPremium: boolean;
  tags: string[];
  durationMin: number | null;
  stepCount: number;
  topic: { name: string; slug: string; icon: string };
};

export const getTopics = cache(async () =>
  prisma.topic.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { position: "asc" },
    select: { id: true, name: true, slug: true, description: true, icon: true },
  }),
);

export const getTopicBySlug = cache(async (slug: string) =>
  prisma.topic.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, name: true, slug: true, description: true, icon: true },
  }),
);

export type QuizFilters = {
  topicSlug?: string;
  difficulty?: Difficulty | "ALL";
  access?: "ALL" | "FREE" | "PREMIUM";
  q?: string;
  take?: number;
};

export async function listQuizzes(
  filters: QuizFilters = {},
): Promise<PublicQuiz[]> {
  const where: Prisma.QuizWhereInput = { status: "PUBLISHED" };

  if (filters.topicSlug) {
    where.topic = { slug: filters.topicSlug };
  }
  if (filters.difficulty && filters.difficulty !== "ALL") {
    where.difficulty = filters.difficulty;
  }
  if (filters.access === "FREE") where.isPremium = false;
  if (filters.access === "PREMIUM") where.isPremium = true;
  if (filters.q?.trim()) {
    // Postgres full-text-lite: title/slug/description substring match, plus
    // topic name so "aws ec2" finds the right bucket.
    const needle = filters.q.trim();
    where.OR = [
      { title: { contains: needle, mode: "insensitive" } },
      { description: { contains: needle, mode: "insensitive" } },
      { topic: { name: { contains: needle, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.quiz.findMany({
    where,
    orderBy: [{ topic: { position: "asc" } }, { title: "asc" }],
    take: filters.take ?? 200,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      difficulty: true,
      isPremium: true,
      tags: true,
      timeLimitSec: true,
      topic: { select: { name: true, slug: true, icon: true } },
      _count: { select: { questions: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    difficulty: r.difficulty,
    isPremium: r.isPremium,
    tags: r.tags,
    timeLimitSec: r.timeLimitSec,
    topic: r.topic,
    questionCount: r._count.questions,
  }));
}

export type ScenarioFilters = {
  topicSlug?: string;
  difficulty?: Difficulty | "ALL";
  access?: "ALL" | "FREE" | "PREMIUM";
  q?: string;
  take?: number;
};

export async function listScenarios(
  filters: ScenarioFilters = {},
): Promise<PublicScenario[]> {
  const where: Prisma.ScenarioWhereInput = { status: "PUBLISHED" };

  if (filters.topicSlug) where.topic = { slug: filters.topicSlug };
  if (filters.difficulty && filters.difficulty !== "ALL") {
    where.difficulty = filters.difficulty;
  }
  if (filters.access === "FREE") where.isPremium = false;
  if (filters.access === "PREMIUM") where.isPremium = true;
  if (filters.q?.trim()) {
    const needle = filters.q.trim();
    where.OR = [
      { title: { contains: needle, mode: "insensitive" } },
      { summary: { contains: needle, mode: "insensitive" } },
      { topic: { name: { contains: needle, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.scenario.findMany({
    where,
    orderBy: [{ topic: { position: "asc" } }, { title: "asc" }],
    take: filters.take ?? 200,
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      difficulty: true,
      isPremium: true,
      tags: true,
      durationMin: true,
      topic: { select: { name: true, slug: true, icon: true } },
      _count: { select: { steps: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    difficulty: r.difficulty,
    isPremium: r.isPremium,
    tags: r.tags,
    durationMin: r.durationMin,
    stepCount: r._count.steps,
    topic: r.topic,
  }));
}

export const getQuizBySlug = cache(async (slug: string) =>
  prisma.quiz.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      difficulty: true,
      isPremium: true,
      tags: true,
      timeLimitSec: true,
      topic: { select: { name: true, slug: true, icon: true } },
      _count: { select: { questions: true } },
    },
  }),
);

export const getScenarioBySlug = cache(async (slug: string) =>
  prisma.scenario.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      context: true,
      symptoms: true,
      environment: true,
      difficulty: true,
      isPremium: true,
      tags: true,
      durationMin: true,
      rootCause: true,
      fix: true,
      prevention: true,
      topic: { select: { name: true, slug: true, icon: true } },
      _count: { select: { steps: true } },
    },
  }),
);

/** Free-tier counts used on the homepage and pricing page. */
export const getContentStats = cache(async () => {
  const [questions, scenarios, topics, quizzes, freeQuizzes, freeScenarios] =
    await Promise.all([
      prisma.question.count({ where: { status: "PUBLISHED" } }),
      prisma.scenario.count({ where: { status: "PUBLISHED" } }),
      prisma.topic.count({ where: { status: "PUBLISHED" } }),
      prisma.quiz.count({ where: { status: "PUBLISHED" } }),
      prisma.quiz.count({ where: { status: "PUBLISHED", isPremium: false } }),
      prisma.scenario.count({ where: { status: "PUBLISHED", isPremium: false } }),
    ]);

  return { questions, scenarios, topics, quizzes, freeQuizzes, freeScenarios };
});

export type TopicWithCounts = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  quizCount: number;
  scenarioCount: number;
  questionCount: number;
};

export async function getTopicsWithCounts(): Promise<TopicWithCounts[]> {
  const topics = await prisma.topic.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      _count: {
        select: {
          quizzes: { where: { status: "PUBLISHED" } },
          scenarios: { where: { status: "PUBLISHED" } },
          questions: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });

  return topics.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    icon: t.icon,
    quizCount: t._count.quizzes,
    scenarioCount: t._count.scenarios,
    questionCount: t._count.questions,
  }));
}
