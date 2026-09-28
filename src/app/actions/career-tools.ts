"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, getClientIp } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { sendCareerWaitlistEmail } from "@/lib/email";
import { isCareerToolsLive } from "@/lib/settings";

/**
 * Career Tools waitlist (addendum).
 *
 * Interest capture only. Deliberately stores no resume content, accepts no file
 * uploads and calls no AI service: the product does not exist yet, and this
 * endpoint exists so we can measure demand before building it.
 */

const FEATURES = ["RESUME_MAKER", "JD_MATCH", "AI_REVIEW"] as const;
type Feature = (typeof FEATURES)[number];

export type WaitlistState = {
  ok?: boolean;
  error?: string;
  message?: string;
  joined?: boolean;
  features?: string[];
};

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  features: z.array(z.enum(FEATURES)).min(1, "Pick at least one feature."),
  source: z.enum(["DASHBOARD", "PRICING", "LANDING"]),
});

/**
 * Joins the waitlist. Idempotent per email: a repeat submission merges the new
 * selections into the existing row rather than creating a duplicate.
 */
export async function joinCareerWaitlistAction(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  if (!(await isCareerToolsLive())) {
    return { error: "The waitlist is not currently open." };
  }

  const ip = await getClientIp();
  const limit = rateLimit(`career-waitlist:${ip}`, 5, 3600);
  if (!limit.ok) {
    return { error: "Too many requests. Please try again later." };
  }

  const parsed = waitlistSchema.safeParse({
    email: formData.get("email"),
    features: formData.getAll("features").map(String),
    source: formData.get("source") ?? "LANDING",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const { email, features, source } = parsed.data;
  const user = await getCurrentUser();

  const existing = await prisma.careerWaitlist.findUnique({
    where: { email },
    select: { id: true, features: true },
  });

  if (existing) {
    const merged = [...new Set([...existing.features, ...features])];

    await prisma.careerWaitlist.update({
      where: { id: existing.id },
      data: { features: merged, unsubscribedAt: null },
    });

    await prisma.careerTeaserEvent.create({
      data: { type: "NOTIFY_CLICKED", userId: user?.id ?? null, source },
    });

    return {
      ok: true,
      joined: true,
      features: merged,
      message: "You are already on the list. We have updated your preferences.",
    };
  }

  await prisma.careerWaitlist.create({
    data: {
      email,
      userId: user?.id ?? null,
      features: features as Feature[],
      source,
    },
  });

  await prisma.careerTeaserEvent.createMany({
    data: [
      { type: "NOTIFY_CLICKED", userId: user?.id ?? null, source },
      ...features.map((feature) => ({
        type: "FEATURE_SELECTED" as const,
        userId: user?.id ?? null,
        source,
        feature: feature as Feature,
      })),
    ],
  });

  // Best-effort confirmation; a mail failure must not lose the signup.
  try {
    await sendCareerWaitlistEmail({ to: email, features: features as Feature[] });
  } catch (error) {
    console.error("[career-tools] waitlist email failed:", error);
  }

  return {
    ok: true,
    joined: true,
    features,
    message: "You are on the list. We will email you when this launches.",
  };
}

/** One-click variant for signed-in users, where no form is needed. */
export async function quickJoinWaitlistAction(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  if (!(await isCareerToolsLive())) {
    return { error: "The waitlist is not currently open." };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to join the waitlist." };

  const requested = formData
    .getAll("features")
    .map(String)
    .filter((value): value is Feature =>
      (FEATURES as readonly string[]).includes(value),
    );

  // The dashboard card does not ask for a preference, so default to all three.
  const selected: Feature[] = requested.length > 0 ? requested : [...FEATURES];
  const rawSource = String(formData.get("source") ?? "DASHBOARD");
  const source =
    rawSource === "PRICING" || rawSource === "LANDING" ? rawSource : "DASHBOARD";

  const existing = await prisma.careerWaitlist.findUnique({
    where: { email: user.email },
    select: { id: true, features: true },
  });

  if (existing) {
    return {
      ok: true,
      joined: true,
      features: existing.features,
      message: "You are already on the list.",
    };
  }

  await prisma.careerWaitlist.create({
    data: {
      email: user.email,
      userId: user.id,
      features: selected,
      source,
    },
  });

  await prisma.careerTeaserEvent.create({
    data: { type: "NOTIFY_CLICKED", userId: user.id, source },
  });

  try {
    await sendCareerWaitlistEmail({ to: user.email, features: selected });
  } catch (error) {
    console.error("[career-tools] waitlist email failed:", error);
  }

  return {
    ok: true,
    joined: true,
    features: selected,
    message: "You are on the list. We will email you when this launches.",
  };
}

/**
 * Records a teaser view for the admin funnel. Analytics must never break a page
 * render, so failures are swallowed.
 */
export async function trackTeaserViewAction(
  source: "DASHBOARD" | "PRICING" | "LANDING",
): Promise<void> {
  if (!(await isCareerToolsLive())) return;

  const user = await getCurrentUser();
  try {
    await prisma.careerTeaserEvent.create({
      data: { type: "TEASER_VIEWED", userId: user?.id ?? null, source },
    });
  } catch {
    // Intentionally ignored.
  }
}

/** Unsubscribe target. Clears the flag rather than deleting the record. */
export async function unsubscribeWaitlistAction(email: string): Promise<void> {
  if (!(await isCareerToolsLive())) return;

  const normalised = email.trim().toLowerCase();
  if (!normalised) return;

  await prisma.careerWaitlist.updateMany({
    where: { email: normalised, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });

  revalidatePath("/career-tools");
}
