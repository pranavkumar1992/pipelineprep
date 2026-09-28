/* eslint-disable no-console */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { aws } from "./seed-data/topics-aws";
import { linux } from "./seed-data/topics-linux";
import { docker } from "./seed-data/topics-docker";
import { kubernetes } from "./seed-data/topics-kubernetes";
import { terraform } from "./seed-data/topics-terraform";
import { cicd } from "./seed-data/topics-cicd";
import { monitoring, iam } from "./seed-data/topics-monitoring-iam";
import { networking } from "./seed-data/topics-networking";
import { interview } from "./seed-data/topics-interview";
import { SCENARIOS } from "./seed-data/scenarios";
import type { SeedScenario, SeedTopic } from "./seed-data/types";

// The Prisma CLI loads .env via prisma.config.ts, but this script also runs
// standalone (`npm run db:seed`), so load it here too.
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.join(process.cwd(), ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Cannot seed.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TOPICS: SeedTopic[] = [
  aws,
  linux,
  docker,
  kubernetes,
  terraform,
  cicd,
  monitoring,
  networking,
  iam,
  interview,
];

/** All three topic modules are keyed the same; assert so a copy/paste slip fails loudly. */
function assertTopicShape(topic: SeedTopic, expectedSlug: string) {
  if (topic.slug !== expectedSlug) {
    throw new Error(
      `Topic slug mismatch: expected "${expectedSlug}", got "${topic.slug}"`,
    );
  }
}

async function seedTopics() {
  let questionCount = 0;
  let quizCount = 0;

  for (const [index, seedTopic] of TOPICS.entries()) {
    assertTopicShape(seedTopic, seedTopic.slug);

    const topic = await prisma.topic.upsert({
      where: { slug: seedTopic.slug },
      update: {
        name: seedTopic.name,
        description: seedTopic.description,
        icon: seedTopic.icon,
        position: index + 1,
      },
      create: {
        name: seedTopic.name,
        slug: seedTopic.slug,
        description: seedTopic.description,
        icon: seedTopic.icon,
        position: index + 1,
        status: "PUBLISHED",
      },
    });

    for (const seedQuiz of seedTopic.quizzes) {
      const quiz = await prisma.quiz.upsert({
        where: { slug: seedQuiz.slug },
        update: {
          title: seedQuiz.title,
          description: seedQuiz.description,
          difficulty: seedQuiz.difficulty,
          isPremium: seedQuiz.isPremium,
          tags: seedQuiz.tags ?? [],
          topicId: topic.id,
          status: "PUBLISHED",
        },
        create: {
          title: seedQuiz.title,
          slug: seedQuiz.slug,
          description: seedQuiz.description,
          difficulty: seedQuiz.difficulty,
          isPremium: seedQuiz.isPremium,
          tags: seedQuiz.tags ?? [],
          timeLimitSec: seedQuiz.timeLimitSec ?? null,
          topicId: topic.id,
          status: "PUBLISHED",
        },
      });

      // Questions have no natural unique key, so replace the set per quiz.
      // This keeps the seed idempotent when question text is edited.
      await prisma.question.deleteMany({ where: { quizId: quiz.id } });

      for (const [position, seedQuestion] of seedQuiz.questions.entries()) {
        if (seedQuestion.options.length < 3) {
          throw new Error(
            `Quiz "${seedQuiz.slug}" question ${position + 1} has fewer than 3 options`,
          );
        }
        for (const correct of seedQuestion.correct) {
          if (correct < 0 || correct >= seedQuestion.options.length) {
            throw new Error(
              `Quiz "${seedQuiz.slug}" question ${position + 1} has out-of-range correct index ${correct}`,
            );
          }
        }

        await prisma.question.create({
          data: {
            quizId: quiz.id,
            topicId: topic.id,
            text: seedQuestion.text,
            options: seedQuestion.options,
            correctOptions: seedQuestion.correct,
            explanation: seedQuestion.explanation,
            difficulty: seedQuestion.difficulty,
            tags: seedQuestion.tags ?? [],
            status: "PUBLISHED",
            position: position + 1,
          },
        });
        questionCount += 1;
      }
      quizCount += 1;
    }
    console.log(`  topic ${seedTopic.slug}: ${seedTopic.quizzes.length} quizzes`);
  }

  return { quizCount, questionCount };
}

async function seedScenarios() {
  let stepCount = 0;

  for (const seed of SCENARIOS) {
    const topic = await prisma.topic.findUnique({
      where: { slug: topicSlugForScenario(seed) },
    });
    if (!topic) {
      throw new Error(
        `Scenario "${seed.slug}" maps to unknown topic "${topicSlugForScenario(seed)}"`,
      );
    }

    const scenario = await prisma.scenario.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        summary: seed.summary,
        context: seed.context,
        symptoms: seed.symptoms,
        environment: seed.environment,
        difficulty: seed.difficulty,
        isPremium: seed.isPremium,
        tags: seed.tags ?? [],
        durationMin: seed.durationMin,
        rootCause: seed.rootCause,
        fix: seed.fix,
        prevention: seed.prevention,
        topicId: topic.id,
        status: "PUBLISHED",
      },
      create: {
        title: seed.title,
        slug: seed.slug,
        summary: seed.summary,
        context: seed.context,
        symptoms: seed.symptoms,
        environment: seed.environment,
        difficulty: seed.difficulty,
        isPremium: seed.isPremium,
        tags: seed.tags ?? [],
        durationMin: seed.durationMin,
        rootCause: seed.rootCause,
        fix: seed.fix,
        prevention: seed.prevention,
        topicId: topic.id,
        status: "PUBLISHED",
      },
    });

    await prisma.scenarioStep.deleteMany({ where: { scenarioId: scenario.id } });

    for (const [index, step] of seed.steps.entries()) {
      await prisma.scenarioStep.create({
        data: {
          scenarioId: scenario.id,
          order: index + 1,
          prompt: step.prompt,
          options: step.options ?? [],
          correctOptions: step.correct ?? [],
          reasoning: step.reasoning,
          codeBlocks: (step.code ?? []) as unknown as Prisma.InputJsonValue,
        },
      });
      stepCount += 1;
    }
  }

  return { scenarioCount: SCENARIOS.length, stepCount };
}

/** Scenario topic is derived from the slug prefix, keeping the data file flat. */
function topicSlugForScenario(scenario: SeedScenario): string {
  const prefixes: Array<[string, string]> = [
    ["alb-", "aws"],
    ["linux-", "linux"],
    ["k8s-", "kubernetes"],
    ["docker-", "networking"],
    ["networking-", "networking"],
    ["cicd-", "ci-cd"],
    ["aws-", "aws"],
  ];
  for (const [prefix, slug] of prefixes) {
    if (scenario.slug.startsWith(prefix)) return slug;
  }
  throw new Error(`No topic mapping for scenario slug "${scenario.slug}"`);
}

async function seedPlans() {
  const plans = [
    {
      name: "Free",
      description:
        "Try PipelinePrep with no card. Free quizzes across every topic, progress tracking, and two full incident walkthroughs.",
      durationDays: 0,
      priceInr: 0,
      position: 0,
      isFreeTier: true,
      lifetime: false,
      features: [
        "Free quizzes across every topic",
        "Daily Challenge and streak tracking",
        "Two full incident walkthroughs",
        "Progress and performance tracking",
      ],
    },
    {
      name: "6 Months",
      description: "Best value for serious learners.",
      durationDays: 180,
      priceInr: 159,
      position: 1,
      isFreeTier: false,
      lifetime: false,
      features: [
        "Unlimited quizzes — all topics, all difficulties",
        "Every real-world scenario with solutions",
        "Interview prep collection",
        "Attempt history & progress tracking",
        "180 days (6 months) of access",
        "Priority access to new content",
      ],
    },
    {
      name: "Yearly",
      description: "Commit for a full year and save big.",
      durationDays: 365,
      priceInr: 299,
      position: 2,
      isFreeTier: false,
      lifetime: false,
      features: [
        "Unlimited quizzes — all topics, all difficulties",
        "Every real-world scenario with solutions",
        "Interview prep collection",
        "Attempt history & progress tracking",
        "365 days of access",
        "Priority access to new content",
      ],
    },
    {
      name: "Lifetime",
      description: "Pay once, keep premium access forever.",
      durationDays: 0,
      priceInr: 449,
      position: 3,
      isFreeTier: false,
      lifetime: true,
      features: [
        "Everything in premium, forever",
        "All quizzes and scenarios",
        "AI mock interviews",
        "All future content included",
        "Priority support",
      ],
    },
  ];

  // Plans no longer in the list above are retired rather than left purchasable,
  // so renaming or dropping a plan does not strand it on the pricing page.
  const names = plans.map((p) => p.name);
  await prisma.plan.updateMany({
    where: { name: { notIn: names } },
    data: { active: false },
  });

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        description: plan.description,
        durationDays: plan.durationDays,
        priceInr: plan.priceInr,
        active: true,
        position: plan.position,
        isFreeTier: plan.isFreeTier,
        lifetime: plan.lifetime,
        features: plan.features,
      },
      create: { ...plan, active: true },
    });
  }

  return plans.length;
}

async function seedCoupons() {
  const year = new Date().getFullYear();
  const validTo = new Date(year, 11, 31, 23, 59, 59);

  const coupons = [
    {
      code: "LAUNCH50",
      type: "PERCENT" as const,
      value: 50,
      maxUses: 500,
      perUserLimit: 1,
      validTo,
      description: "50% off your first Premium plan.",
    },
    {
      code: "DEVOPS100",
      type: "FLAT" as const,
      value: 100,
      maxUses: 1000,
      perUserLimit: 1,
      validTo,
      description: "Flat INR 100 off any Premium plan.",
    },
    {
      code: "STUDENT150",
      type: "FLAT" as const,
      value: 150,
      maxUses: 200,
      perUserLimit: 1,
      validTo,
      description: "Flat INR 150 off. For students and career changers.",
    },
    {
      code: "REFER10",
      type: "PERCENT" as const,
      value: 10,
      maxUses: null,
      perUserLimit: 3,
      validTo,
      description: "10% off, up to three uses per account.",
    },
  ];

  const monthly = await prisma.plan.findUnique({ where: { name: "1 Month" } });
  const sixMonth = await prisma.plan.findUnique({ where: { name: "6 Months" } });

  for (const coupon of coupons) {
    const record = await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        type: coupon.type,
        value: coupon.value,
        maxUses: coupon.maxUses,
        perUserLimit: coupon.perUserLimit,
        validTo: coupon.validTo,
        active: true,
      },
      create: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        maxUses: coupon.maxUses,
        perUserLimit: coupon.perUserLimit,
        validTo: coupon.validTo,
        active: true,
      },
    });

    // Restrict to the paid plans only; never the free tier.
    const planIds = [monthly?.id, sixMonth?.id].filter(
      (id): id is string => Boolean(id),
    );
    if (planIds.length > 0) {
      await prisma.couponPlan.deleteMany({ where: { couponId: record.id } });
      await prisma.couponPlan.createMany({
        data: planIds.map((planId) => ({ couponId: record.id, planId })),
      });
    }
  }

  return coupons.length;
}

async function seedAdmin() {
  const email = (
    process.env.ADMIN_EMAIL ?? "admin@pipelineprep.in"
  ).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe!2026";
  const name = process.env.ADMIN_NAME ?? "PipelinePrep Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", emailVerified: true },
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  return { email, password };
}

async function main() {
  console.log("Seeding PipelinePrep...\n");

  console.log("[1/5] Admin user");
  const admin = await seedAdmin();

  console.log("[2/5] Topics, quizzes and questions");
  const { quizCount, questionCount } = await seedTopics();

  console.log("[3/5] Scenarios and steps");
  const { scenarioCount, stepCount } = await seedScenarios();

  console.log("[4/5] Plans");
  const planCount = await seedPlans();

  console.log("[5/5] Coupons");
  const couponCount = await seedCoupons();

  console.log("\n--- Seed complete ---");
  console.log(`  topics     : ${TOPICS.length}`);
  console.log(`  quizzes    : ${quizCount}`);
  console.log(`  questions  : ${questionCount}`);
  console.log(`  scenarios  : ${scenarioCount}`);
  console.log(`  steps      : ${stepCount}`);
  console.log(`  plans      : ${planCount}`);
  console.log(`  coupons    : ${couponCount}`);
  console.log(`\n  Admin login: ${admin.email}`);
  console.log(
    `  Password   : ${process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD)" : "ChangeMe!2026  <- change this"}`,
  );
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
