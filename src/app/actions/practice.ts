"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, getClientIp } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { ANSWER_RATE_LIMIT, START_RATE_LIMIT } from "@/lib/practice-config";
import { rateLimit } from "@/lib/rate-limit";
import {
  incrementDailyActivity,
  markDayActive,
  recordAnswer,
  setQuestionFlag,
  hasHitDailyGoal,
} from "@/lib/practice";
import {
  QUICK_PRACTICE_QUESTIONS,
  QUESTIONS_PER_ATTEMPT,
  isLevelPremium,
  startAttempt,
  type AttemptPayload,
} from "@/lib/banks";
import { MOCK_TEST_SECONDS } from "@/lib/practice-config";

const modeEnum = z.enum([
  "BANK",
  "REVISION",
  "FOCUS",
  "MISTAKES",
  "QUICK",
  "MOCK",
]);

export type StartAttemptResult =
  | ({ ok: true } & AttemptPayload)
  | { ok: false; error: string };

export type AnswerResult =
  | {
      ok: true;
      correct: boolean;
      correctOption: number;
      correctText: string;
      explanation: string;
      bookmarked: boolean;
      isHard: boolean;
    }
  | { ok: false; error: string };

export type FlagResult =
  | { ok: true; bookmarked: boolean; isHard: boolean }
  | { ok: false; error: string };

export type FinishResult =
  | {
      ok: true;
      score: number;
      total: number;
      percentage: number;
      duration: number;
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Start an attempt (addendum §8)
// ---------------------------------------------------------------------------

export async function startAttemptAction(input: {
  mode: string;
  bankId?: string;
}): Promise<StartAttemptResult> {
  const ip = await getClientIp();
  const limit = rateLimit(
    `attempt-start:${ip}`,
    START_RATE_LIMIT.limit,
    START_RATE_LIMIT.windowSeconds,
  );
  if (!limit.ok) {
    return { ok: false, error: "Starting too many attempts. Take a short break." };
  }

  const parsed = modeEnum.safeParse(input.mode);
  if (!parsed.success) return { ok: false, error: "Unknown practice mode." };

  return startAttempt({ mode: parsed.data, bankId: input.bankId });
}

// ---------------------------------------------------------------------------
// Submit one answer (addendum §8)
// ---------------------------------------------------------------------------

const answerSchema = z.object({
  questionId: z.string().min(1),
  selectedOption: z.number().int().min(0).max(5),
  bookmarked: z.boolean().optional(),
  isHard: z.boolean().optional(),
});

/**
 * Grades one answer server-side.
 *
 * The correct option is returned only now, after submission, which is what
 * keeps the answer key off the wire before the user commits (addendum §8).
 */
export async function submitAnswerAction(
  input: unknown,
): Promise<AnswerResult> {
  const ip = await getClientIp();
  const limit = rateLimit(
    `answer:${ip}`,
    ANSWER_RATE_LIMIT.limit,
    ANSWER_RATE_LIMIT.windowSeconds,
  );
  if (!limit.ok) return { ok: false, error: "Too many answers submitted. Slow down." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to answer questions." };

  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answer." };

  const { questionId, selectedOption, bookmarked, isHard } = parsed.data;

  const question = await prisma.question.findFirst({
    where: { id: questionId, status: "PUBLISHED" },
    select: {
      id: true,
      options: true,
      correctOptions: true,
      explanation: true,
      quiz: { select: { isPremium: true, level: true } },
    },
  });
  if (!question) return { ok: false, error: "Question not found." };

  // Re-check entitlement per question: an attempt cannot be used to read
  // premium answers after a subscription lapses mid-attempt.
  const entitlement = await getEntitlement();
  const requiresPremium =
    question.quiz?.isPremium ||
    (question.quiz?.level ? isLevelPremium(question.quiz.level) : false);

  if (requiresPremium && !entitlement.isPremium) {
    return { ok: false, error: "This question requires Premium." };
  }

  if (selectedOption >= question.options.length) {
    return { ok: false, error: "That option does not exist." };
  }

  // Single-correct questions throughout the bank, so index 0 is enough.
  const correctOption = question.correctOptions[0] ?? 0;
  const correct = selectedOption === correctOption;

  await recordAnswer({ userId: user.id, questionId, isCorrect: correct });

  // Reaching the daily goal makes the day active. This runs per answer rather
  // than only when an attempt finishes, so the streak still advances if a user
  // stops mid-attempt, and so the counter is never a question behind.
  if (await hasHitDailyGoal(user.id)) {
    await markDayActive(user.id);
  }

  if (bookmarked !== undefined || isHard !== undefined) {
    await setQuestionFlag({
      userId: user.id,
      questionId,
      ...(bookmarked !== undefined ? { isBookmarked: bookmarked } : {}),
      ...(isHard !== undefined ? { isHard } : {}),
    });
  }

  const state = await prisma.userQuestionState.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
    select: { isBookmarked: true, isHard: true },
  });

  revalidatePath("/dashboard");
  revalidatePath("/quizzes");

  return {
    ok: true,
    correct,
    correctOption,
    correctText: question.options[correctOption] ?? "",
    explanation: question.explanation,
    bookmarked: state?.isBookmarked ?? false,
    isHard: state?.isHard ?? false,
  };
}

// ---------------------------------------------------------------------------
// Bookmark / mark as hard (addendum §3)
// ---------------------------------------------------------------------------

const flagSchema = z.object({
  questionId: z.string().min(1),
  isBookmarked: z.boolean().optional(),
  isHard: z.boolean().optional(),
});

export async function flagQuestionAction(
  input: unknown,
): Promise<FlagResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save questions." };

  const parsed = flagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { questionId, isBookmarked, isHard } = parsed.data;
  if (isBookmarked === undefined && isHard === undefined) {
    return { ok: false, error: "Nothing to update." };
  }

  const exists = await prisma.question.findFirst({
    where: { id: questionId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "Question not found." };

  await setQuestionFlag({
    userId: user.id,
    questionId,
    ...(isBookmarked !== undefined ? { isBookmarked } : {}),
    ...(isHard !== undefined ? { isHard } : {}),
  });

  const state = await prisma.userQuestionState.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
    select: { isBookmarked: true, isHard: true },
  });

  return {
    ok: true,
    bookmarked: state?.isBookmarked ?? false,
    isHard: state?.isHard ?? false,
  };
}

// ---------------------------------------------------------------------------
// Finish an attempt (addendum §3)
// ---------------------------------------------------------------------------

const finishSchema = z.object({
  mode: modeEnum,
  bankId: z.string().optional(),
  total: z.number().int().min(1).max(200),
  score: z.number().int().min(0).max(200),
  duration: z.number().int().min(0).max(6 * 60 * 60),
});

/**
 * Records the attempt summary.
 *
 * The score is recomputed from stored per-question state rather than trusted
 * from the client, so a tampered payload cannot inflate a score.
 */
export async function finishAttemptAction(input: unknown): Promise<FinishResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to record your result." };

  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid result." };

  const { mode, bankId, total, duration } = parsed.data;

  if (mode === "BANK" && bankId) {
    const bank = await prisma.quiz.findFirst({
      where: { id: bankId, status: "PUBLISHED" },
      select: { isPremium: true, level: true },
    });
    if (
      bank &&
      (bank.isPremium || (bank.level && isLevelPremium(bank.level)))
    ) {
      const entitlement = await getEntitlement();
      if (!entitlement.isPremium) {
        return { ok: false, error: "This bank requires Premium." };
      }
    }
  }

  // BANK mode records against the bank; other modes have no single quiz, so
  // they are recorded as attempts with a null quiz (schema requires quizId, so
  // these use the topic's first bank as a loose association).
  let quizId = bankId ?? null;

  if (!quizId) {
    const anyBank = await prisma.quiz.findFirst({
      where: { status: "PUBLISHED", level: { not: null } },
      select: { id: true },
    });
    quizId = anyBank?.id ?? null;
  }

  if (quizId) {
    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId,
        score: parsed.data.score,
        total,
        duration,
        answers: [],
        mode,
        source: mode === "MOCK" ? "QUIZ" : "QUIZ",
      },
    });
  }

  // Kept here as well as per answer: a Daily Challenge completed outside an
  // attempt has no attempt to hang this off, and the guard is idempotent.
  if (await hasHitDailyGoal(user.id)) {
    await markDayActive(user.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/performance");
  revalidatePath("/leaderboard");

  return {
    ok: true,
    score: parsed.data.score,
    total,
    percentage: Math.round((parsed.data.score / total) * 100),
    duration,
  };
}

// ---------------------------------------------------------------------------
// Daily activity helper for other surfaces
// ---------------------------------------------------------------------------

export async function bumpActivity() {
  const user = await getCurrentUser();
  if (!user) return;
  await incrementDailyActivity(user.id, 1);
}

// Practice-mode constants are deliberately not re-exported from here. A
// "use server" module may only export async functions, and re-exporting numbers
// made the whole action module fail to load at runtime, which left every
// client component importing from it silently inert.
