"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { grantPremium } from "@/lib/orders";
import { normaliseTags, uniqueSlug } from "@/lib/utils";
import { SETTING_KEYS, writeSetting } from "@/lib/settings";

export type AdminState = {
  ok?: boolean;
  error?: string;
  message?: string;
  /** Populated after a bulk import so the UI can report what happened. */
  summary?: {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
};

/** Every action starts by asserting admin. Centralised so it cannot be missed. */
async function assertAdmin() {
  const admin = await requireAdmin();
  return admin;
}

const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD"]);
const statusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

function listFrom(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

const topicSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required.").max(60),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().min(10, "Add a short description.").max(400),
  icon: z.string().trim().max(40).default("Book"),
  position: z.coerce.number().int().min(0).max(99).default(0),
});

export async function saveTopicAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await assertAdmin();

  const parsed = topicSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description"),
    icon: formData.get("icon") || "Book",
    position: formData.get("position") ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const d = parsed.data;

  if (d.id) {
    await prisma.topic.update({
      where: { id: d.id },
      data: {
        name: d.name,
        description: d.description,
        icon: d.icon,
        position: d.position,
      },
    });
    revalidatePath("/admin/topics");
    return { ok: true, message: `Updated ${d.name}.` };
  }

  // Slug: explicit, or derived and de-duplicated.
  const base = d.slug || d.name;
  const slug = await uniqueSlug(base, async (candidate) => {
    const found = await prisma.topic.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return Boolean(found);
  });

  await prisma.topic.create({
    data: {
      name: d.name,
      slug,
      description: d.description,
      icon: d.icon,
      position: d.position,
      status: "PUBLISHED",
    },
  });

  revalidatePath("/admin/topics");
  revalidatePath("/quizzes");
  return { ok: true, message: `Created topic "${d.name}" with slug ${slug}.` };
}

export async function deleteTopicAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing topic id." };

  // Cascades to quizzes, questions and scenarios. Guard against accidents.
  const counts = await prisma.topic.findUnique({
    where: { id },
    select: {
      _count: { select: { quizzes: true, questions: true, scenarios: true } },
      name: true,
    },
  });
  if (!counts) return { error: "Topic not found." };

  const total = counts._count.quizzes + counts._count.scenarios;
  if (total > 0 && formData.get("confirm") !== "DELETE") {
    return {
      error: `"${counts.name}" holds ${counts._count.quizzes} quiz(es) and ${counts._count.scenarios} scenario(s), which will also be deleted. Type DELETE to confirm.`,
    };
  }

  await prisma.topic.delete({ where: { id } });
  revalidatePath("/admin/topics");
  revalidatePath("/quizzes");
  return { ok: true, message: `Deleted "${counts.name}" and its content.` };
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

const quizSchema = z.object({
  id: z.string().optional(),
  topicId: z.string().min(1, "Choose a topic."),
  title: z.string().trim().min(3, "Title is required.").max(160),
  description: z.string().trim().max(600).optional(),
  difficulty: difficultyEnum,
  isPremium: z.boolean(),
  status: statusEnum,
  timeLimitSec: z.string().trim().optional(),
});

export async function saveQuizAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();

  const timeLimitRaw = String(formData.get("timeLimitSec") ?? "").trim();

  const parsed = quizSchema.safeParse({
    id: formData.get("id") || undefined,
    topicId: formData.get("topicId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    difficulty: formData.get("difficulty"),
    isPremium: formData.get("isPremium") === "on",
    status: formData.get("status"),
    timeLimitSec: timeLimitRaw || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const d = parsed.data;
  const timeLimitSec = d.timeLimitSec ? Number(d.timeLimitSec) : null;
  if (timeLimitSec !== null && (!Number.isFinite(timeLimitSec) || timeLimitSec < 30)) {
    return { error: "Time limit must be at least 30 seconds, or blank." };
  }

  const data = {
    topicId: d.topicId,
    title: d.title,
    description: d.description ?? null,
    difficulty: d.difficulty,
    isPremium: d.isPremium,
    status: d.status,
    timeLimitSec,
  };

  if (d.id) {
    await prisma.quiz.update({ where: { id: d.id }, data });
    revalidatePath("/admin/quizzes");
    return { ok: true, message: `Updated "${d.title}".` };
  }

  const slug = await uniqueSlug(d.title, async (candidate) => {
    const found = await prisma.quiz.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return Boolean(found);
  });

  await prisma.quiz.create({ data: { ...data, slug } });

  revalidatePath("/admin/quizzes");
  revalidatePath("/quizzes");
  return { ok: true, message: `Created quiz with slug ${slug}. Add questions next.` };
}

export async function deleteQuizAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing quiz id." };

  await prisma.quiz.delete({ where: { id } });
  revalidatePath("/admin/quizzes");
  revalidatePath("/quizzes");
  return { ok: true, message: "Quiz and its questions deleted." };
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const questionSchema = z.object({
  id: z.string().optional(),
  quizId: z.string().optional(),
  topicId: z.string().min(1, "Choose a topic."),
  text: z.string().trim().min(10, "Question text is too short.").max(2000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
  correctOptions: z.array(z.number().int().min(0).max(5)).min(1),
  explanation: z
    .string()
    .trim()
    .min(20, "Write a real explanation (at least 20 characters)."),
  difficulty: difficultyEnum,
  tags: z.string().optional(),
  status: statusEnum,
});

export async function saveQuestionAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();

  const parsed = questionSchema.safeParse({
    id: formData.get("id") || undefined,
    quizId: formData.get("quizId") || undefined,
    topicId: formData.get("topicId"),
    text: formData.get("text"),
    options: listFrom(formData.get("options")),
    correctOptions: listFrom(formData.get("correctOptions")).map(Number),
    explanation: formData.get("explanation"),
    difficulty: formData.get("difficulty"),
    tags: formData.get("tags") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const d = parsed.data;

  // Correct indexes must point at real options.
  for (const index of d.correctOptions) {
    if (index >= d.options.length) {
      return {
        error: `Correct answer refers to option ${index + 1}, but only ${d.options.length} options were given.`,
      };
    }
  }

  // Infer the topic from the quiz when one is selected, so the two agree.
  let topicId = d.topicId;
  if (d.quizId) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: d.quizId },
      select: { topicId: true },
    });
    if (!quiz) return { error: "That quiz no longer exists." };
    topicId = quiz.topicId;
  }

  const data = {
    topicId,
    quizId: d.quizId ?? null,
    text: d.text,
    options: d.options,
    correctOptions: [...new Set(d.correctOptions)],
    explanation: d.explanation,
    difficulty: d.difficulty,
    tags: normaliseTags(d.tags ?? ""),
    status: d.status,
  };

  if (d.id) {
    await prisma.question.update({ where: { id: d.id }, data });
    revalidatePath("/admin/questions");
    return { ok: true, message: "Question updated." };
  }

  const position =
    d.quizId === undefined
      ? 0
      : ((await prisma.question.count({ where: { quizId: d.quizId } })) + 1);

  await prisma.question.create({ data: { ...data, position } });

  revalidatePath("/admin/questions");
  return { ok: true, message: "Question added." };
}

export async function deleteQuestionAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing question id." };

  await prisma.question.delete({ where: { id } });
  revalidatePath("/admin/questions");
  return { ok: true, message: "Question deleted." };
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const scenarioSchema = z.object({
  id: z.string().optional(),
  topicId: z.string().min(1, "Choose a topic."),
  title: z.string().trim().min(5, "Title is required.").max(200),
  summary: z.string().trim().min(20, "Add a summary.").max(500),
  context: z.string().trim().min(30, "Describe the situation."),
  symptoms: z.string().trim().min(10, "List the symptoms."),
  environment: z.string().trim().min(10, "List the environment."),
  difficulty: difficultyEnum,
  isPremium: z.boolean(),
  status: statusEnum,
  durationMin: z.string().trim().optional(),
  rootCause: z.string().trim().optional(),
  fix: z.string().trim().optional(),
  prevention: z.string().trim().optional(),
  tags: z.string().optional(),
});

export async function saveScenarioAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();

  const durationRaw = String(formData.get("durationMin") ?? "").trim();

  const parsed = scenarioSchema.safeParse({
    id: formData.get("id") || undefined,
    topicId: formData.get("topicId"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    context: formData.get("context"),
    symptoms: formData.get("symptoms"),
    environment: formData.get("environment"),
    difficulty: formData.get("difficulty"),
    isPremium: formData.get("isPremium") === "on",
    status: formData.get("status"),
    durationMin: durationRaw || undefined,
    rootCause: formData.get("rootCause") || undefined,
    fix: formData.get("fix") || undefined,
    prevention: formData.get("prevention") || undefined,
    tags: formData.get("tags") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const d = parsed.data;
  const durationMin = d.durationMin ? Number(d.durationMin) : null;
  if (durationMin !== null && (!Number.isFinite(durationMin) || durationMin < 1)) {
    return { error: "Duration must be a positive number of minutes, or blank." };
  }

  const data = {
    topicId: d.topicId,
    title: d.title,
    summary: d.summary,
    context: d.context,
    symptoms: d.symptoms,
    environment: d.environment,
    difficulty: d.difficulty,
    isPremium: d.isPremium,
    status: d.status,
    durationMin,
    rootCause: d.rootCause ?? null,
    fix: d.fix ?? null,
    prevention: d.prevention ?? null,
    tags: normaliseTags(d.tags ?? ""),
  };

  if (d.id) {
    await prisma.scenario.update({ where: { id: d.id }, data });
    revalidatePath("/admin/scenarios");
    revalidatePath("/scenarios");
    return { ok: true, message: `Updated "${d.title}".` };
  }

  const slug = await uniqueSlug(d.title, async (candidate) => {
    const found = await prisma.scenario.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return Boolean(found);
  });

  await prisma.scenario.create({ data: { ...data, slug } });
  revalidatePath("/admin/scenarios");
  revalidatePath("/scenarios");
  return { ok: true, message: `Created scenario as /scenarios/${slug}. Add steps next.` };
}

export async function deleteScenarioAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing scenario id." };

  await prisma.scenario.delete({ where: { id } });
  revalidatePath("/admin/scenarios");
  revalidatePath("/scenarios");
  return { ok: true, message: "Scenario and its steps deleted." };
}

// ---------------------------------------------------------------------------
// Scenario steps
// ---------------------------------------------------------------------------

const stepSchema = z.object({
  scenarioId: z.string().min(1),
  prompt: z.string().trim().min(10, "Ask a question in the prompt."),
  options: z.array(z.string().trim().min(1).max(500)).max(6),
  correctOptions: z.array(z.number().int().min(0).max(5)),
  reasoning: z.string().trim().min(20, "Explain the reasoning."),
  codeBlock: z.string().trim().optional(),
  codeLanguage: z.string().trim().optional(),
});

export async function addScenarioStepAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();

  const parsed = stepSchema.safeParse({
    scenarioId: formData.get("scenarioId"),
    prompt: formData.get("prompt"),
    options: listFrom(formData.get("options")),
    correctOptions: listFrom(formData.get("correctOptions")).map(Number),
    reasoning: formData.get("reasoning"),
    codeBlock: formData.get("codeBlock") || undefined,
    codeLanguage: formData.get("codeLanguage") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const d = parsed.data;

  for (const index of d.correctOptions) {
    if (index >= d.options.length) {
      return { error: "Correct answer refers to an option that does not exist." };
    }
  }

  const last = await prisma.scenarioStep.findFirst({
    where: { scenarioId: d.scenarioId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const codeBlocks = d.codeBlock
    ? [
        {
          language: d.codeLanguage || "bash",
          code: d.codeBlock,
        },
      ]
    : [];

  await prisma.scenarioStep.create({
    data: {
      scenarioId: d.scenarioId,
      order: (last?.order ?? 0) + 1,
      prompt: d.prompt,
      options: d.options,
      correctOptions: [...new Set(d.correctOptions)],
      reasoning: d.reasoning,
      codeBlocks,
    },
  });

  revalidatePath("/admin/scenarios");
  return { ok: true, message: "Step added." };
}

export async function deleteScenarioStepAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing step id." };

  await prisma.scenarioStep.delete({ where: { id } });
  revalidatePath("/admin/scenarios");
  return { ok: true, message: "Step deleted." };
}

// ---------------------------------------------------------------------------
// Users and premium grants
// ---------------------------------------------------------------------------

export async function grantPremiumAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await assertAdmin();

  const userId = String(formData.get("userId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const daysRaw = String(formData.get("days") ?? "").trim();
  const days = daysRaw ? Number(daysRaw) : undefined;

  if (!userId || !planId) return { error: "Missing user or plan." };

  const result = await grantPremium({
    userId,
    planId,
    days: days && Number.isFinite(days) ? days : undefined,
    grantedBy: admin.email,
  });

  if (!result.ok) return { error: result.error ?? "Could not grant access." };

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `Premium granted until ${result.expiresAt?.toDateString()}.`,
  };
}

export async function revokePremiumAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Missing user." };

  const { count } = await prisma.subscription.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/admin/users");
  return {
    ok: true,
    message: count > 0 ? "Premium access revoked." : "That user had no active subscription.",
  };
}

export async function markRefundAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Missing order." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order) return { error: "Order not found." };
  if (order.status !== "PAID") {
    return { error: "Only paid orders can be marked refunded." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });

  revalidatePath("/admin/orders");
  return { ok: true, message: "Order marked refunded. Access is not revoked automatically." };
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

const couponSchema = z.object({
  code: z.string().trim().min(3, "Code is too short.").max(30),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.coerce.number().int().min(1, "Value must be at least 1."),
  maxUses: z.string().trim().optional(),
  perUserLimit: z.coerce.number().int().min(1).max(50).default(1),
  validTo: z.string().trim().optional(),
  planIds: z.array(z.string()),
  active: z.boolean(),
});

export async function saveCouponAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();

  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    maxUses: String(formData.get("maxUses") ?? "") || undefined,
    perUserLimit: formData.get("perUserLimit") ?? 1,
    validTo: String(formData.get("validTo") ?? "") || undefined,
    planIds: formData.getAll("planIds").map(String),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const d = parsed.data;
  const code = d.code.toUpperCase().replace(/\s+/g, "");

  if (d.type === "PERCENT" && d.value > 100) {
    return { error: "A percentage discount cannot exceed 100." };
  }

  const validTo = d.validTo ? new Date(d.validTo) : null;
  if (validTo && Number.isNaN(validTo.getTime())) {
    return { error: "Expiry date is not valid." };
  }

  const existing = await prisma.coupon.findUnique({ where: { code } });

  const record = existing
    ? await prisma.coupon.update({
        where: { code },
        data: {
          type: d.type,
          value: d.value,
          maxUses: d.maxUses ? Number(d.maxUses) : null,
          perUserLimit: d.perUserLimit,
          validTo,
          active: d.active,
        },
      })
    : await prisma.coupon.create({
        data: {
          code,
          type: d.type,
          value: d.value,
          maxUses: d.maxUses ? Number(d.maxUses) : null,
          perUserLimit: d.perUserLimit,
          validTo,
          active: d.active,
        },
      });

  await prisma.couponPlan.deleteMany({ where: { couponId: record.id } });
  if (d.planIds.length > 0) {
    await prisma.couponPlan.createMany({
      data: d.planIds.map((planId) => ({ couponId: record.id, planId })),
    });
  }

  revalidatePath("/admin/coupons");
  revalidatePath("/pricing");
  return {
    ok: true,
    message: `${existing ? "Updated" : "Created"} coupon ${code}.${
      d.planIds.length === 0 ? " Applies to all plans." : ""
    }`,
  };
}

export async function toggleCouponAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing coupon." };

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    select: { active: true, code: true },
  });
  if (!coupon) return { error: "Coupon not found." };

  await prisma.coupon.update({
    where: { id },
    data: { active: !coupon.active },
  });

  revalidatePath("/admin/coupons");
  return {
    ok: true,
    message: `${coupon.code} is now ${coupon.active ? "inactive" : "active"}.`,
  };
}

export async function deleteCouponAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing coupon." };

  await prisma.coupon.delete({ where: { id } });
  revalidatePath("/admin/coupons");
  return { ok: true, message: "Coupon deleted." };
}

// ---------------------------------------------------------------------------
// Messages and reports
// ---------------------------------------------------------------------------

export async function markMessageAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing message." };

  await prisma.contactMessage.update({
    where: { id },
    data: { handled: !formData.get("handled") },
  });

  revalidatePath("/admin/messages");
  return { ok: true, message: "Message updated." };
}

export async function resolveReportAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing report." };

  await prisma.questionReport.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  revalidatePath("/admin/questions");
  revalidatePath("/admin/reports");
  return { ok: true, message: "Report marked resolved." };
}

// ---------------------------------------------------------------------------
// Plans and payment settings
// ---------------------------------------------------------------------------

const planSchema = z.object({
  id: z.string().min(1),
  priceInr: z.coerce.number().int().min(0).max(1_000_000),
  durationDays: z.coerce.number().int().min(0).max(36_500),
  description: z.string().trim().max(300).optional(),
  active: z.boolean(),
  lifetime: z.boolean(),
  position: z.coerce.number().int().min(0).max(999),
});

/**
 * Saves one plan's commercial details.
 *
 * Features are edited as newline-separated text rather than a repeatable field
 * so the form works without client-side array state.
 */
export async function savePlanAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();

  const parsed = planSchema.safeParse({
    id: formData.get("id"),
    priceInr: formData.get("priceInr"),
    durationDays: formData.get("durationDays"),
    description: formData.get("description") ?? undefined,
    active: formData.get("active") === "on",
    lifetime: formData.get("lifetime") === "on",
    position: formData.get("position"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid plan details." };
  }

  const data = parsed.data;

  // A lifetime plan has no duration, and a free tier must not be pay-once.
  if (!data.lifetime && data.priceInr === 0 && data.durationDays === 0) {
    return {
      error: "Set a duration or mark the plan as lifetime, otherwise it looks free.",
    };
  }

  const features = String(formData.get("features") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  const plan = await prisma.plan.findUnique({
    where: { id: data.id },
    select: { name: true },
  });
  if (!plan) return { error: "Plan not found." };

  await prisma.plan.update({
    where: { id: data.id },
    data: {
      priceInr: data.priceInr,
      durationDays: data.lifetime ? 0 : data.durationDays,
      description: data.description || null,
      active: data.active,
      lifetime: data.lifetime,
      position: data.position,
      features,
    },
  });

  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/subscription");

  return { ok: true, message: `Saved "${plan.name}".` };
}

const settingsSchema = z.object({
  keyId: z.string().trim().max(200),
  keySecret: z.string().trim().max(200),
  webhookSecret: z.string().trim().max(200),
  gstRate: z.coerce.number().min(0).max(100),
  checkoutEnabled: z.boolean(),
  careerToolsEnabled: z.boolean(),
});

/**
 * Saves payment and feature settings.
 *
 * Blank secret fields mean "leave the existing value alone" rather than "clear
 * it", so an admin updating only the GST rate cannot accidentally wipe the
 * Razorpay credentials. Clearing is done explicitly via `clear*` flags.
 */
export async function saveSettingsAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();

  const parsed = settingsSchema.safeParse({
    keyId: formData.get("keyId") ?? "",
    keySecret: formData.get("keySecret") ?? "",
    webhookSecret: formData.get("webhookSecret") ?? "",
    gstRate: formData.get("gstRate") ?? 18,
    checkoutEnabled: formData.get("checkoutEnabled") === "on",
    careerToolsEnabled: formData.get("careerToolsEnabled") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }

  const { keyId, keySecret, webhookSecret, gstRate } = parsed.data;

  // An environment variable always takes precedence, so writing the same key to
  // the database here would have no effect and would be misleading.
  const envLocked: string[] = [];
  const persist = async (
    settingKey: (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS],
    value: string,
    envName: string,
    clear: boolean,
  ) => {
    if (process.env[envName]) {
      envLocked.push(envName);
      return;
    }
    await writeSetting(settingKey, clear ? "" : value);
  };

  await persist(SETTING_KEYS.razorpayKeyId, keyId, "RAZORPAY_KEY_ID", keyId === "");
  await persist(
    SETTING_KEYS.razorpayKeySecret,
    keySecret,
    "RAZORPAY_KEY_SECRET",
    keySecret === "",
  );
  await persist(
    SETTING_KEYS.razorpayWebhookSecret,
    webhookSecret,
    "RAZORPAY_WEBHOOK_SECRET",
    webhookSecret === "",
  );

  await writeSetting(SETTING_KEYS.gstRate, String(gstRate));
  await writeSetting(
    SETTING_KEYS.checkoutEnabled,
    parsed.data.checkoutEnabled ? "true" : "false",
  );
  await writeSetting(
    SETTING_KEYS.careerToolsEnabled,
    parsed.data.careerToolsEnabled ? "true" : "false",
  );

  revalidatePath("/admin/settings");
  revalidatePath("/pricing");
  revalidatePath("/career-tools");
  revalidatePath("/dashboard");

  if (envLocked.length > 0) {
    return {
      ok: true,
      message: `Saved. ${envLocked.join(", ")} ${envLocked.length === 1 ? "is" : "are"} set in the environment and takes precedence over the values saved here.`,
    };
  }

  return { ok: true, message: "Settings saved." };
}

// ---------------------------------------------------------------------------
// Bulk import (D-3)
// ---------------------------------------------------------------------------

type ImportRow = {
  topicSlug?: string;
  quizSlug?: string;
  question?: string;
  options?: string;
  correct?: string;
  explanation?: string;
  difficulty?: string;
  tags?: string;
};

/** Accepts CSV or JSON. Both are parsed here rather than on the client. */
export async function bulkImportAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertAdmin();

  const raw = String(formData.get("payload") ?? "").trim();
  const quizSlug = String(formData.get("quizSlug") ?? "").trim();

  if (!raw) return { error: "Paste or upload a CSV or JSON payload." };

  let rows: ImportRow[];
  try {
    rows = parseImport(raw);
  } catch (error) {
    return {
      error: `Could not parse input: ${
        error instanceof Error ? error.message : "unknown format error"
      }`,
    };
  }

  if (rows.length === 0) return { error: "No rows found in that input." };

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  const plan = await prisma.quiz.findUnique({
    where: { slug: quizSlug },
    select: { id: true, topicId: true, title: true },
  });
  if (!plan) {
    return {
      error: `No quiz with slug "${quizSlug}". Create the quiz first, then import into it.`,
    };
  }

  // Starting position after any existing questions.
  let position = await prisma.question.count({ where: { quizId: plan.id } });

  for (const [index, row] of rows.entries()) {
    const lineNo = index + 1;

    const text = (row.question ?? "").trim();
    const explanation = (row.explanation ?? "").trim();
    const options = splitOptions(row.options);
    const correct = parseCorrect(row.correct, options.length);

    if (!text) {
      errors.push(`Row ${lineNo}: question text is missing.`);
      skipped += 1;
      continue;
    }
    if (options.length < 2) {
      errors.push(`Row ${lineNo}: needs at least 2 options.`);
      skipped += 1;
      continue;
    }
    if (correct.length === 0) {
      errors.push(`Row ${lineNo}: correct answer is missing or out of range.`);
      skipped += 1;
      continue;
    }
    if (explanation.length < 20) {
      errors.push(`Row ${lineNo}: explanation must be at least 20 characters.`);
      skipped += 1;
      continue;
    }

    // Skip exact duplicates within this quiz, so a re-run is safe.
    const duplicate = await prisma.question.findFirst({
      where: { quizId: plan.id, text },
      select: { id: true },
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const difficulty = normaliseDifficulty(row.difficulty);
    if (difficulty === null) {
      errors.push(`Row ${lineNo}: difficulty must be EASY, MEDIUM or HARD.`);
      skipped += 1;
      continue;
    }

    position += 1;
    await prisma.question.create({
      data: {
        quizId: plan.id,
        topicId: plan.topicId,
        text,
        options,
        correctOptions: correct,
        explanation,
        difficulty,
        tags: normaliseTags(row.tags ?? ""),
        status: "PUBLISHED",
        position,
      },
    });
    created += 1;
  }

  revalidatePath("/admin/questions");
  revalidatePath("/quizzes");

  return {
    ok: true,
    summary: { created, updated: 0, skipped, errors: errors.slice(0, 12) },
    message: `Imported ${created} question(s) into "${plan.title}".${
      skipped > 0 ? ` Skipped ${skipped}.` : ""
    }`,
  };
}

/** Detects JSON vs CSV and returns normalised rows. */
function parseImport(raw: string): ImportRow[] {
  if (raw.startsWith("[") || raw.startsWith("{")) {
    const parsed: unknown = JSON.parse(raw);
    const array = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && "questions" in parsed
        ? ((parsed as { questions: unknown }).questions as unknown[])
        : null;
    if (!Array.isArray(array)) {
      throw new Error("JSON must be an array, or an object with a questions array.");
    }
    return array as ImportRow[];
  }

  // Minimal RFC-4180-ish CSV: handles quoted fields with embedded commas and
  // doubled quotes, plus CRLF line endings.
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (inQuotes) {
      if (char === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const header = rows.shift()?.map((h) => h.trim().toLowerCase());
  if (!header || header.length === 0) return [];

  const aliases: Record<string, string> = {
    text: "question",
    question_text: "question",
    questiontext: "question",
    opts: "options",
    answer: "correct",
    correct_answer: "correct",
    "correct answer": "correct",
    topic: "topicSlug",
    topic_slug: "topicSlug",
    quiz: "quizSlug",
    quiz_slug: "quizSlug",
    level: "difficulty",
  };

  const mapped = header.map((h) => aliases[h] ?? h);

  return rows
    .filter((r) => r.some((cell) => cell.trim().length > 0))
    .map((r) => {
      const record: ImportRow = {};
      mapped.forEach((key, i) => {
        if (key) (record as Record<string, string | undefined>)[key] = r[i] ?? "";
      });
      return record;
    });
}

/** Accepts "B", "B,D", "2", "1;3" and "b or d". Returns zero-based indexes. */
function parseCorrect(value: string | undefined, optionCount: number): number[] {
  if (!value) return [];
  const letters = "ABCDEFGH";
  const out = new Set<number>();

  for (const token of value.split(/[,;|/]| or /i).map((t) => t.trim().toUpperCase())) {
    if (!token) continue;
    const letterIndex = letters.indexOf(token[0] ?? "");
    if (letterIndex >= 0 && letterIndex < optionCount) {
      out.add(letterIndex);
      continue;
    }
    const numeric = Number(token);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= optionCount) {
      out.add(numeric - 1);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** Options may be newline separated or pipe separated. */
function splitOptions(value: string | undefined): string[] {
  if (!value) return [];
  const parts = value.includes("\n")
    ? value.split("\n")
    : value.split("|");
  return parts.map((p) => p.trim()).filter(Boolean).slice(0, 6);
}

function normaliseDifficulty(
  value: string | undefined,
): "EASY" | "MEDIUM" | "HARD" | null {
  const v = (value ?? "MEDIUM").trim().toUpperCase();
  if (v === "EASY" || v === "HARD") return v;
  if (v === "MEDIUM" || v === "" || v === "MED") return "MEDIUM";
  return null;
}
