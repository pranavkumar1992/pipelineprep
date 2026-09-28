"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, getClientIp } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export type ProgressState =
  | { ok: true; completed: boolean }
  | { ok: false; error: string };

const progressSchema = z.object({
  scenarioId: z.string().min(1),
  step: z.number().int().min(0).max(500),
  completed: z.boolean(),
});

/**
 * Records scenario progress (S-4) as the user advances.
 *
 * Upserts on the (userId, scenarioId) unique key, so it is safe to call on
 * every step. Access is re-checked server-side so progress cannot be written
 * for premium content the caller cannot access.
 */
export async function saveScenarioProgressAction(
  input: unknown,
): Promise<ProgressState> {
  const ip = await getClientIp();
  const limit = rateLimit(
    `scenario:${ip}`,
    LIMITS.scenarioStep.limit,
    LIMITS.scenarioStep.window,
  );
  if (!limit.ok) return { ok: false, error: "Slow down a moment." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to track progress." };

  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid progress update." };

  const { scenarioId, step, completed } = parsed.data;

  const scenario = await prisma.scenario.findFirst({
    where: { id: scenarioId, status: "PUBLISHED" },
    select: { isPremium: true, _count: { select: { steps: true } } },
  });
  if (!scenario) return { ok: false, error: "Scenario not found." };

  // Clamp so a tampered client cannot claim absurd progress.
  const stepCount = scenario._count.steps;
  const safeStep = Math.min(step, stepCount);
  const isComplete = completed && safeStep >= stepCount;

  if (scenario.isPremium) {
    const entitlement = await getEntitlement();
    if (!entitlement.isPremium) {
      return { ok: false, error: "This scenario requires Premium." };
    }
  }

  await prisma.scenarioProgress.upsert({
    where: { userId_scenarioId: { userId: user.id, scenarioId } },
    create: {
      userId: user.id,
      scenarioId,
      currentStep: safeStep,
      completedAt: isComplete ? new Date() : null,
    },
    update: {
      currentStep: safeStep,
      // Once complete, stay complete.
      ...(isComplete ? { completedAt: new Date() } : {}),
    },
  });

  revalidatePath("/dashboard");

  return { ok: true, completed: isComplete };
}
