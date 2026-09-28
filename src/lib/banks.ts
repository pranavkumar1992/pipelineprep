import "server-only";
import { cache } from "react";
import type { BankLevel, PracticeMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import {
  MOCK_TEST_SECONDS,
  QUESTIONS_PER_ATTEMPT,
  QUICK_PRACTICE_QUESTIONS,
} from "@/lib/practice-config";
import { loadQuestionStates, getTopicAccuracy } from "@/lib/practice";

/**
 * Attempt construction (addendum §3).
 *
 * Two rules that matter for the acceptance criteria:
 *  1. No question repeats within an attempt.
 *  2. Draw order prioritises unseen, then previously wrong, then correct.
 *
 * Correct answers are never included in the returned payload.
 */

export type AttemptQuestion = {
  id: string;
  text: string;
  options: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicName: string;
};

export type AttemptPayload = {
  questions: AttemptQuestion[];
  mode: PracticeMode;
  /** Seconds remaining, for timed modes only. */
  durationSec: number | null;
  /** Human label for the review screen. */
  label: string;
};

export type StartResult =
  | ({ ok: true } & AttemptPayload)
  | { ok: false; error: string };

/** Level -> premium requirement. Beginner is the free tier (addendum §2B). */
export function isLevelPremium(level: BankLevel): boolean {
  return level !== "BEGINNER";
}

/**
 * Loads banks grouped by topic and level, with per-user progress.
 * Powers the topic sections on /quizzes.
 */
export const getBankGrid = cache(async () => {
  const user = await getCurrentUser();
  const entitlement = await getEntitlement();
  const isPremium = entitlement.isPremium;

  const topics = await prisma.topic.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { position: "asc" },
    select: { id: true, name: true, slug: true, description: true, icon: true },
  });

  const banks = await prisma.quiz.findMany({
    where: { status: "PUBLISHED", level: { not: null } },
    select: {
      id: true,
      topicId: true,
      title: true,
      slug: true,
      description: true,
      level: true,
      isPremium: true,
      _count: { select: { questions: { where: { status: "PUBLISHED" } } } },
    },
  });

  const { loadBankProgress } = await import("@/lib/practice");
  const progress = user ? await loadBankProgress(user.id) : new Map();

  const sections = topics
    .map((topic) => {
      const levels = banks.filter((b) => b.topicId === topic.id);

      return {
        topic: { id: topic.id, name: topic.name, slug: topic.slug, icon: topic.icon },
        banks: (["BEGINNER", "INTERMEDIATE", "ADVANCED"] as BankLevel[]).map(
          (level) => {
            const bank = levels.find((b) => b.level === level);
            if (!bank) return null;

            // The lock is decided here on the server, never in the client
            // (addendum §2B and §8). Beginner is always free; the higher
            // levels require Premium.
            const requiresPremium = isLevelPremium(level) && !isPremium;

            const stats = progress.get(bank.id) ?? {
              seen: 0,
              mastered: 0,
              total: bank._count.questions,
            };

            return {
              id: bank.id,
              slug: bank.slug,
              title: bank.title,
              description: bank.description,
              level,
              total: stats.total,
              seen: stats.seen,
              mastered: stats.mastered,
              locked: requiresPremium,
            } as const;
          },
        ).filter((b): b is NonNullable<typeof b> => b !== null),
      };
    })
    .filter((section) => section.banks.length > 0);

  return { sections, isPremium };
});

/**
 * Restricts a `where` clause to questions a free user is entitled to see.
 *
 * A question with no bank is treated as free content. That matters because the
 * seeder leaves questions unassigned and the bank seeder distributes them
 * afterwards, so mid-distribution some questions legitimately have no quiz yet.
 * Locking those would hide content the user cannot otherwise reach at all.
 */
function freeQuestionFilter() {
  return {
    OR: [
      { quiz: { is: null } },
      { quiz: { is: { isPremium: false } } },
    ],
  };
}

/** Builds the question pool for a mode, before sampling. */
async function buildPool(
  userId: string,
  mode: PracticeMode,
  isPremium: boolean,
  bankId?: string,
): Promise<{ ids: string[]; label: string }> {
  if (mode === "REVISION") {
    const rows = await prisma.userQuestionState.findMany({
      where: {
        userId,
        question: { status: "PUBLISHED", ...(isPremium ? {} : freeQuestionFilter()) },
        OR: [{ isBookmarked: true }, { isHard: true }],
      },
      select: { questionId: true },
    });
    return { ids: rows.map((r) => r.questionId), label: "Revision" };
  }

  if (mode === "MISTAKES") {
    // Previously answered wrong: seen at least once and not yet mastered.
    const rows = await prisma.userQuestionState.findMany({
      where: {
        userId,
        question: { status: "PUBLISHED", ...(isPremium ? {} : freeQuestionFilter()) },
        timesSeen: { gt: 0 },
        mastered: false,
        timesCorrect: { lt: 1 },
      },
      select: { questionId: true },
    });

    // Also include questions answered wrong at least once, even if later
    // answered correctly, since they are the ones worth revisiting.
    const partial = await prisma.userQuestionState.findMany({
      where: {
        userId,
        question: { status: "PUBLISHED", ...(isPremium ? {} : freeQuestionFilter()) },
        mastered: false,
        timesCorrect: { gt: 0 },
      },
      select: { questionId: true, timesSeen: true, timesCorrect: true },
    });

    const ids = new Set(rows.map((r) => r.questionId));
    for (const row of partial) {
      if (row.timesSeen > row.timesCorrect) ids.add(row.questionId);
    }

    return { ids: [...ids], label: "Practice Mistakes" };
  }

  if (mode === "FOCUS") {
    // Weakest topics by accuracy, then draw across those topics.
    const weak = await getTopicAccuracy(userId);
    if (weak.length === 0) return { ids: [], label: "Focus Areas" };

    const topicIds = weak.slice(0, 3).map((t) => t.topicId);

    // Only questions the user has already seen, so practice reinforces known
    // weak spots rather than introducing new material.
    const seenStates = await prisma.userQuestionState.findMany({
      where: {
        userId,
        timesSeen: { gt: 0 },
        question: {
          status: "PUBLISHED",
          topicId: { in: topicIds },
          ...(isPremium ? {} : freeQuestionFilter()),
        },
      },
      select: { questionId: true },
    });

    return {
      ids: seenStates.map((s) => s.questionId),
      label: `Focus Areas: ${weak.slice(0, 3).map((t) => t.topicName).join(", ")}`,
    };
  }

  if (mode === "QUICK" || mode === "MOCK") {
    /*
     * Drawn from every topic, so the pool has to be filtered by entitlement
     * here rather than relying on the per-answer gate in `submitAnswerAction`.
     *
     * Without this, a free user is shown premium questions and then told
     * "This question requires Premium" when they submit, which reads as a bug
     * rather than as the lock it is. Filtering at draw time means the question
     * never appears in the first place, and the per-answer gate stays as
     * defence in depth for a subscription that lapses mid-attempt.
     */
    const rows = await prisma.question.findMany({
      where: { status: "PUBLISHED", ...(isPremium ? {} : freeQuestionFilter()) },
      select: { id: true },
    });
    return { ids: rows.map((r) => r.id), label: mode === "QUICK" ? "Quick Practice" : "Mixed Mock Test" };
  }

  // BANK mode: a specific topic + level bank.
  if (!bankId) return { ids: [], label: "Practice" };

  const bank = await prisma.quiz.findFirst({
    where: { id: bankId, status: "PUBLISHED" },
    select: { id: true, title: true, topicId: true },
  });
  if (!bank) return { ids: [], label: "Practice" };

  const rows = await prisma.question.findMany({
    where: { status: "PUBLISHED", quizId: bank.id },
    select: { id: true },
  });

  return { ids: rows.map((r) => r.id), label: bank.title };
}

/**
 * Samples up to `count` questions: unseen first, then wrong, then correct.
 * Within each bucket the order is randomised so repeated attempts differ.
 */
async function sampleQuestions(
  userId: string,
  ids: string[],
  count: number,
): Promise<string[]> {
  if (ids.length === 0) return [];

  const states = await loadQuestionStates(userId, ids);

  const unseen: string[] = [];
  const wrong: string[] = [];
  const correct: string[] = [];

  for (const id of ids) {
    const state = states.get(id);
    if (!state || state.timesSeen === 0) unseen.push(id);
    else if (state.timesCorrect < state.timesSeen) wrong.push(id);
    else correct.push(id);
  }

  const shuffle = (arr: string[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  };

  // Priority order: unseen first, then previously wrong, then correct.
  const picked = [
    ...shuffle(unseen).slice(0, count),
    ...shuffle(wrong).slice(0, Math.max(0, count - unseen.length)),
  ];

  if (picked.length < count) {
    picked.push(...shuffle(correct).slice(0, count - picked.length));
  }

  // Distinct ids only: enforces the "no repeats within an attempt" rule even
  // if a pool somehow contains the same id twice.
  return [...new Set(picked)].slice(0, count);
}

/** Starts an attempt. Enforces premium gating server-side (addendum §8). */
export async function startAttempt(input: {
  mode: PracticeMode;
  bankId?: string;
  count?: number;
}): Promise<StartResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to start practising." };

  const entitlement = await getEntitlement();

  if (input.mode === "BANK") {
    if (!input.bankId) return { ok: false, error: "No bank selected." };

    const bank = await prisma.quiz.findFirst({
      where: { id: input.bankId, status: "PUBLISHED", level: { not: null } },
      select: { id: true, level: true, isPremium: true, title: true },
    });
    if (!bank) return { ok: false, error: "That bank no longer exists." };

    // The critical server-side gate: a free user requesting an
    // Intermediate/Advanced bank gets 403-equivalent behaviour even when
    // calling the action directly.
    if ((bank.isPremium || (bank.level && isLevelPremium(bank.level))) && !entitlement.isPremium) {
      return { ok: false, error: "This level requires Premium." };
    }
  }

  const { ids, label } = await buildPool(
    user.id,
    input.mode,
    entitlement.isPremium,
    input.bankId,
  );

  if (ids.length === 0) {
    return {
      ok: false,
      error: EMPTY_STATE[input.mode] ?? "No questions available for this mode yet.",
    };
  }

  const count =
    input.count ??
    (input.mode === "QUICK" ? QUICK_PRACTICE_QUESTIONS : QUESTIONS_PER_ATTEMPT);

  const chosen = await sampleQuestions(user.id, ids, count);
  if (chosen.length === 0) {
    return { ok: false, error: "Could not draw any questions. Try another mode." };
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: chosen }, status: "PUBLISHED" },
    select: {
      id: true,
      text: true,
      options: true,
      difficulty: true,
      topic: { select: { name: true } },
    },
  });

  // Preserve the sampling order rather than the database's arbitrary order.
  const order = new Map(chosen.map((id, i) => [id, i]));
  questions.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return {
    ok: true,
    mode: input.mode,
    label,
    durationSec: input.mode === "MOCK" ? MOCK_TEST_SECONDS : null,
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      difficulty: q.difficulty,
      topicName: q.topic.name,
    })),
  };
}

const EMPTY_STATE: Partial<Record<PracticeMode, string>> = {
  REVISION:
    "No bookmarked or hard questions yet. Use the bookmark and 'mark as hard' actions while practising, and they will appear here.",
  MISTAKES:
    "You have not got any questions wrong yet, which is a good problem to have. Answer a few questions and any misses will show up here.",
  FOCUS:
    "Not enough history yet to spot weak areas. Answer some questions across a few topics and Focus Areas will target them automatically.",
};

/** Marks mode cards with no data so the UI can show an empty state instead. */
export async function getModeAvailability(): Promise<
  Record<string, { available: boolean; count: number }>
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      REVISION: { available: false, count: 0 },
      MISTAKES: { available: false, count: 0 },
      FOCUS: { available: false, count: 0 },
    };
  }

  const [revision, mistakes, weak] = await Promise.all([
    prisma.userQuestionState.count({
      where: { userId: user.id, OR: [{ isBookmarked: true }, { isHard: true }] },
    }),
    prisma.userQuestionState.count({
      where: {
        userId: user.id,
        mastered: false,
        OR: [{ timesCorrect: { lt: 1 } }, { timesSeen: { gt: 0 } }],
      },
    }),
    getTopicAccuracy(user.id),
  ]);

  return {
    REVISION: { available: revision > 0, count: revision },
    MISTAKES: { available: mistakes > 0, count: mistakes },
    FOCUS: { available: weak.length > 0, count: weak.length },
  };
}

export { QUESTIONS_PER_ATTEMPT, QUICK_PRACTICE_QUESTIONS };
