"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, getClientIp } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { getUserTimezone, markDayActive, todayIn } from "@/lib/practice";
import { isLevelPremium } from "@/lib/banks";
import { rateLimit } from "@/lib/rate-limit";

export type DailySubmitResult =
  | {
      ok: true;
      correct: boolean;
      correctOption: number;
      correctText: string;
      explanation: string;
      streak: { current: number; longest: number; activeDays: number };
      stats: { completed: number; accuracyPct: number };
    }
  | { ok: false; error: string };

const submitSchema = z.object({
  questionId: z.string().min(1),
  selectedOption: z.number().int().min(0).max(5),
});

/**
 * Sub today's Daily Challenge answer.
 *
 * One attempt per user per date: the unique constraint on
 * (userId, date) is what enforces the read-only-after-submit rule in §4.
 */
export async function submitDailyChallengeAction(
  input: unknown,
): Promise<DailySubmitResult> {
  const ip = await getClientIp();
  const limit = rateLimit(`daily:${ip}`, 20, 600);
  if (!limit.ok) return { ok: false, error: "Too many attempts. Try again shortly." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to take the Daily Challenge." };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answer." };

  const timezone = await getUserTimezone(user.id);
  const today = todayIn(timezone);

  const challenge = await prisma.dailyChallenge.findUnique({
    where: { date: today },
    select: {
      questionId: true,
      question: {
        select: {
          id: true,
          options: true,
          correctOptions: true,
          explanation: true,
          quiz: { select: { isPremium: true, level: true } },
        },
      },
    },
  });

  if (!challenge) return { ok: false, error: "No Daily Challenge today." };

  // The submitted question must be today's, so a stale client cannot score a
  // different question against today's streak.
  if (challenge.questionId !== parsed.data.questionId) {
    return { ok: false, error: "That is not today's question." };
  }

  const entitlement = await getEntitlement();
  const requiresPremium =
    challenge.question.quiz?.isPremium ||
    (challenge.question.quiz?.level
      ? isLevelPremium(challenge.question.quiz.level)
      : false);
  if (requiresPremium && !entitlement.isPremium) {
    return { ok: false, error: "Today's challenge requires Premium." };
  }

  if (parsed.data.selectedOption >= challenge.question.options.length) {
    return { ok: false, error: "That option does not exist." };
  }

  const already = await prisma.dailyChallengeAttempt.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
    select: { selectedOption: true, isCorrect: true },
  });
  if (already) {
    return { ok: false, error: "You have already completed today's challenge." };
  }

  const correctOption = challenge.question.correctOptions[0] ?? 0;
  const correct = parsed.data.selectedOption === correctOption;

  await prisma.dailyChallengeAttempt.create({
    data: {
      userId: user.id,
      date: today,
      selectedOption: parsed.data.selectedOption,
      isCorrect: correct,
    },
  });

  // Completing the Daily Challenge makes the day active (addendum §6).
  await markDayActive(user.id);

  const [streakRow, allAttempts] = await Promise.all([
    prisma.userStreak.findUnique({
      where: { userId: user.id },
      select: { current: true, longest: true, activeDays: true },
    }),
    prisma.dailyChallengeAttempt.findMany({
      where: { userId: user.id },
      select: { isCorrect: true },
    }),
  ]);

  const completed = allAttempts.length;
  const correctCount = allAttempts.filter((a) => a.isCorrect).length;

  revalidatePath("/daily");
  revalidatePath("/dashboard");

  return {
    ok: true,
    correct,
    correctOption,
    correctText: challenge.question.options[correctOption] ?? "",
    explanation: challenge.question.explanation,
    streak: streakRow ?? { current: 1, longest: 1, activeDays: 1 },
    stats: {
      completed,
      accuracyPct: Math.round((correctCount / completed) * 100),
    },
  };
}

// ---------------------------------------------------------------------------
// Settings (daily goal, theme, timezone)
// ---------------------------------------------------------------------------

export type SettingsState = { ok?: boolean; error?: string; message?: string };

const settingsSchema = z.object({
  dailyGoal: z.coerce.number().int().min(1).max(500),
  timezone: z.string().trim().min(1).max(64),
});

export async function updateSettingsAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to change settings." };

  const parsed = settingsSchema.safeParse({
    dailyGoal: formData.get("dailyGoal"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your settings." };
  }

  const { dailyGoal, timezone } = parsed.data;

  // Reject a timezone the runtime does not recognise, so streak maths never
  // throws later.
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format();
  } catch {
    return { error: "That timezone is not recognised." };
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, dailyGoal, timezone },
    update: { dailyGoal, timezone },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Settings saved." };
}
