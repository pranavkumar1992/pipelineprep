"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, getClientIp } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export type GradeResult =
  | {
      ok: true;
      correct: boolean;
      correctOptions: number[];
      correctText: string[];
      explanation: string;
    }
  | { ok: false; error: string };

export type SubmitResult =
  | { ok: true; attemptId: string; score: number; total: number; duration: number }
  | { ok: false; error: string };

/**
 * Grades a single answer (Q-3: instant feedback with explanation).
 *
 * This runs on the server so the answer key is never shipped to an
 * unauthorised client. It also re-verifies access on every call, so a premium
 * lock cannot be bypassed by replaying a question id.
 */
export async function gradeAnswerAction(input: {
  quizId: string;
  questionId: string;
  selected: number[];
}): Promise<GradeResult> {
  const ip = await getClientIp();
  const limit = rateLimit(
    `grade:${ip}`,
    LIMITS.quizSubmit.limit,
    LIMITS.quizSubmit.window,
  );
  if (!limit.ok) return { ok: false, error: "Slow down a moment." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to answer questions." };

  const quiz = await prisma.quiz.findUnique({
    where: { id: input.quizId },
    select: { isPremium: true, status: true },
  });
  if (!quiz || quiz.status !== "PUBLISHED") {
    return { ok: false, error: "Quiz not found." };
  }

  if (quiz.isPremium) {
    const entitlement = await getEntitlement();
    if (!entitlement.isPremium) {
      return { ok: false, error: "This quiz requires Premium." };
    }
  }

  const question = await prisma.question.findFirst({
    where: { id: input.questionId, quizId: input.quizId, status: "PUBLISHED" },
    select: {
      options: true,
      correctOptions: true,
      explanation: true,
    },
  });
  if (!question) return { ok: false, error: "Question not found." };

  const selected = input.selected.filter(
    (i) => Number.isInteger(i) && i >= 0 && i < question.options.length,
  );

  // Single-correct questions: require an exact match on the correct set.
  const answerKey = [...question.correctOptions].sort((a, b) => a - b);
  const given = [...new Set(selected)].sort((a, b) => a - b);
  const correct =
    answerKey.length === given.length &&
    answerKey.every((value, index) => value === given[index]);

  return {
    ok: true,
    correct,
    correctOptions: answerKey,
    correctText: answerKey.map((i) => question.options[i] ?? ""),
    explanation: question.explanation,
  };
}

const submitSchema = z.object({
  quizId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selected: z.array(z.number().int().min(0)),
      correct: z.boolean(),
    }),
  ),
  duration: z.number().int().min(0).max(60 * 60 * 6),
});

/** Records a completed attempt (Q-4, Q-5). */
export async function submitAttemptAction(
  input: unknown,
): Promise<SubmitResult> {
  const ip = await getClientIp();
  const limit = rateLimit(
    `submit:${ip}`,
    LIMITS.quizSubmit.limit,
    LIMITS.quizSubmit.window,
  );
  if (!limit.ok) return { ok: false, error: "Slow down a moment." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to record your result." };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid submission." };

  const { quizId, answers, duration } = parsed.data;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      isPremium: true,
      status: true,
      _count: { select: { questions: true } },
    },
  });
  if (!quiz || quiz.status !== "PUBLISHED") {
    return { ok: false, error: "Quiz not found." };
  }
  if (answers.length !== quiz._count.questions) {
    return { ok: false, error: "Please answer every question." };
  }

  if (quiz.isPremium) {
    const entitlement = await getEntitlement();
    if (!entitlement.isPremium) {
      return { ok: false, error: "This quiz requires Premium." };
    }
  }

  // Recompute the score server-side rather than trusting client booleans.
  const questions = await prisma.question.findMany({
    where: { quizId, status: "PUBLISHED" },
    select: { id: true, correctOptions: true },
  });
  const answerKey = new Map(questions.map((q) => [q.id, q.correctOptions]));

  let score = 0;
  for (const answer of answers) {
    const expected = answerKey.get(answer.questionId);
    if (!expected) continue;
    const a = [...new Set(answer.selected)].sort((x, y) => x - y);
    const b = [...new Set(expected)].sort((x, y) => x - y);
    if (a.length === b.length && a.every((v, i) => v === b[i])) score += 1;
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      quizId,
      score,
      total: questions.length,
      duration,
      answers: answers as unknown as object,
      source: "QUIZ",
    },
    select: { id: true },
  });

  // Reflect the attempt in the leaderboard aggregates (G-1).
  await prisma.leaderboardEntry.upsert({
    where: {
      userId_period_periodStart: {
        userId: user.id,
        period: "ALLTIME",
        periodStart: new Date(0),
      },
    },
    create: {
      userId: user.id,
      period: "ALLTIME",
      periodStart: new Date(0),
      totalScore: score * 100,
      quizzesCompleted: 1,
      accuracyBps: questions.length
        ? Math.round((score / questions.length) * 10000)
        : 0,
    },
    update: {
      totalScore: { increment: score * 100 },
      quizzesCompleted: { increment: 1 },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");

  return {
    ok: true,
    attemptId: attempt.id,
    score,
    total: questions.length,
    duration,
  };
}
