import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env") });

/**
 * Generates additional question banks at the three levels per topic, then
 * distributes the bank question pool across them.
 *
 * Run after the main seed:
 *   npx tsx prisma/seed-banks.ts
 *
 * Idempotent: banks are upserted by slug and each bank's questions are only
 * created when the bank is empty, so re-running is safe.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

/** Question count target per bank. The addendum allows these to vary. */
const TARGETS: Record<Level, number> = {
  BEGINNER: 60,
  INTERMEDIATE: 40,
  ADVANCED: 25,
};

const BANK_META: Record<
  Level,
  { suffix: string; description: string; premium: boolean }
> = {
  BEGINNER: {
    suffix: "Beginner",
    description:
      "Foundations and definitions. Start here if the terms are new to you.",
    premium: false,
  },
  INTERMEDIATE: {
    suffix: "Intermediate",
    description:
      "Applied knowledge. The decisions you actually make day to day, with the reasoning behind them.",
    premium: true,
  },
  ADVANCED: {
    suffix: "Advanced",
    description:
      "Edge cases, failure modes and the questions that separate a senior from a mid-level engineer.",
    premium: true,
  },
};

/** Difficulty implied by each level, so banks stay coherent. */
const LEVEL_DIFFICULTY: Record<Level, "EASY" | "MEDIUM" | "HARD"> = {
  BEGINNER: "EASY",
  INTERMEDIATE: "MEDIUM",
  ADVANCED: "HARD",
};

async function main() {
  console.log("Seeding question banks...\n");

  const topics = await prisma.topic.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { position: "asc" },
    select: { id: true, name: true, slug: true },
  });

  if (topics.length === 0) {
    console.error("No topics found. Run `npm run db:seed` first.");
    process.exit(1);
  }

  let bankCount = 0;
  let assigned = 0;

  for (const topic of topics) {
    // Every published question in the topic is bank material, wherever it
    // currently sits. A question belongs to exactly one quiz, so questions are
    // moved out of the legacy topic quizzes into the level banks below.
    const all = await prisma.question.findMany({
      where: { topicId: topic.id, status: "PUBLISHED" },
      orderBy: [{ difficulty: "desc" }, { id: "asc" }],
      select: {
        id: true,
        difficulty: true,
        quiz: { select: { level: true } },
      },
    });

    // Distribute round-robin across the three levels rather than mapping one
    // difficulty to one level. A small pool would otherwise leave Advanced
    // nearly empty, which makes the grid look broken. Difficulty is left
    // untouched: it is an independent axis from level.
    const buckets: Record<Level, string[]> = {
      BEGINNER: [],
      INTERMEDIATE: [],
      ADVANCED: [],
    };

    const levels: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
    let cursor = 0;
    for (const question of all) {
      const level = levels[cursor % 3]!;
      buckets[level].push(question.id);
      cursor += 1;
    }

    // Respect the targets where the pool allows it, moving overflow from the
    // largest bucket so a small topic still fills every level.
    for (const level of levels) {
      while (buckets[level].length > TARGETS[level]) {
        // Overflow spills to whichever bucket has the most room.
        const donor = level;
        const target = [...levels]
          .filter((l) => l !== donor)
          .sort((a, b) => buckets[a].length - buckets[b].length)[0];
        if (!target || buckets[target].length >= TARGETS[target] * 1.5) break;
        const moved = buckets[donor].pop();
        if (!moved) break;
        buckets[target].push(moved);
      }
    }

    for (const level of ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as Level[]) {
      const ids = buckets[level];
      if (ids.length === 0) {
        console.log(`  ${topic.slug} ${level}: no questions available, skipped`);
        continue;
      }

      const meta = BANK_META[level];
      const slug = `${topic.slug}-${level.toLowerCase()}`;

      const bank = await prisma.quiz.upsert({
        where: { slug },
        update: {
          title: `${topic.name} - ${meta.suffix}`,
          description: meta.description,
          isPremium: meta.premium,
          level,
          status: "PUBLISHED",
          topicId: topic.id,
        },
        create: {
          title: `${topic.name} - ${meta.suffix}`,
          slug,
          description: meta.description,
          difficulty: LEVEL_DIFFICULTY[level],
          isPremium: meta.premium,
          level,
          status: "PUBLISHED",
          topicId: topic.id,
          tags: [level.toLowerCase()],
        },
      });
      bankCount += 1;

      const existingCount = await prisma.question.count({
        where: { quizId: bank.id },
      });

      if (existingCount === ids.length) {
        console.log(`  ${slug}: already holds all ${existingCount} questions`);
        continue;
      }

      // A question belongs to exactly one quiz, so moving is `update` per row
      // inside a transaction. Bank sizes are ~25-60, which stays fast.
      await prisma.$transaction([
        ...ids.map((questionId, position) =>
          prisma.question.update({
            where: { id: questionId },
            data: { quizId: bank.id, position: position + 1 },
          }),
        ),
        // Drop anything this bank used to hold but is no longer part of it, so
        // re-runs after a content change do not leave orphans behind.
        ...(existingCount > 0
          ? [
              prisma.question.updateMany({
                where: {
                  quizId: bank.id,
                  NOT: { id: { in: ids } },
                },
                data: { quizId: null },
              }),
            ]
          : []),
      ]);

      assigned += ids.length;
      console.log(`  ${slug}: ${ids.length} questions`);
    }
  }

  // The original topic quizzes are now empty of questions. Archive them so they
  // disappear from the catalogue but their history and attempt records survive.
  await prisma.quiz.updateMany({
    where: { level: null, status: "PUBLISHED" },
    data: { status: "ARCHIVED" },
  });

  console.log("\n  Existing questions per level are balanced by round-robin.");
  console.log(
    "  Run the content expansion (seed-content-2) for larger bank sizes.",
  );

  const [total, banks, levels] = await Promise.all([
    prisma.question.count({ where: { status: "PUBLISHED" } }),
    prisma.quiz.count({ where: { status: "PUBLISHED", level: { not: null } } }),
    prisma.quiz.groupBy({ by: ["level"], _count: { _all: true } }),
  ]);

  console.log("\n--- Banks seeded ---");
  console.log(`  topics          : ${topics.length}`);
  console.log(`  banks           : ${bankCount} upserted, ${banks} published`);
  console.log(`  questions placed: ${assigned}`);
  console.log(`  total questions : ${total}`);
  for (const row of levels) {
    console.log(`  ${row.level}: ${row._count._all} banks`);
  }
}

main()
  .catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("\nPrisma error:", error.message);
    } else {
      console.error("\nBank seed failed:", error);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
