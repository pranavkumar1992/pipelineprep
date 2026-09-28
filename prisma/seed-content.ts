import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";

import { readFileSync } from "node:fs";
import { normaliseTags } from "../src/lib/utils";

/**
 * Reads the question volume from the generated JSON.
 *
 * The content is authored as CSV and converted by `scripts/convert-content.ts`
 * into `seed-data/content-volume.json`. Parsing happens once, at authoring time,
 * rather than on every seed run, so a content change is a visible diff.
 */
export type CsvQuestion = {
  topic: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags?: string;
};

function getContentVolume(): Record<string, CsvQuestion[]> {
  const file = path.join(process.cwd(), "prisma", "seed-data", "content-volume.json");
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("content-volume.json is not an object.");
  }

  return parsed as Record<string, CsvQuestion[]>;
}

loadEnv({ path: path.join(process.cwd(), ".env") });

/**
 * Inserts the CSV content volume into the database.
 *
 * Idempotent: a question is keyed on its exact text within its topic, so
 * re-running updates explanations in place rather than duplicating.
 *
 * Run after the bank seeder:
 *   npx tsx prisma/seed-content.ts
 *
 * Once inserted, the bank seeder redistributes questions across the three
 * levels, so run it again afterwards if you want balanced banks:
 *   npx tsx prisma/seed-banks.ts
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("Inserting content volume...\n");

  const volume = getContentVolume();
  const topics = await prisma.topic.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, name: true },
  });
  const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

  // Any topic referenced by the CSV that does not exist yet, created on demand
  // so the CSV is the source of truth for topic coverage.
  for (const slug of Object.keys(volume)) {
    if (topicBySlug.has(slug)) continue;
    const created = await prisma.topic.create({
      data: {
        name: titleFromSlug(slug),
        slug,
        description: `Practice questions and interview preparation for ${titleFromSlug(slug)}.`,
        icon: "Book",
        position: topics.length + 1,
        status: "PUBLISHED",
      },
      select: { id: true, slug: true, name: true },
    });
    topicBySlug.set(slug, created);
    console.log(`  created topic: ${created.name}`);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [topicSlug, rows] of Object.entries(volume)) {
    const topic = topicBySlug.get(topicSlug);
    if (!topic) {
      console.warn(`  !! unknown topic slug "${topicSlug}", skipping`);
      continue;
    }

    let topicCreated = 0;
    let topicUpdated = 0;

    for (const row of rows) {
      const outcome = await upsertQuestion(topic.id, row);
      if (outcome === "created") {
        created += 1;
        topicCreated += 1;
      } else if (outcome === "updated") {
        updated += 1;
        topicUpdated += 1;
      } else {
        skipped += 1;
      }
    }

    console.log(
      `  ${topic.name.padEnd(16)} ${String(topicCreated).padStart(3)} new, ${String(topicUpdated).padStart(3)} updated, ${rows.length - topicCreated - topicUpdated} skipped`,
    );
  }

  const [total, perTopic] = await Promise.all([
    prisma.question.count({ where: { status: "PUBLISHED" } }),
    prisma.question.groupBy({
      by: ["topicId"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    }),
  ]);

  console.log("\n--- Content volume inserted ---");
  console.log(`  created: ${created}`);
  console.log(`  updated: ${updated}`);
  console.log(`  skipped: ${skipped}`);
  console.log(`  total published questions: ${total}`);
  for (const row of perTopic) {
    const topic = topics.find((t) => t.id === row.topicId);
    console.log(`    ${(topic?.name ?? row.topicId).padEnd(16)} ${row._count._all}`);
  }
  console.log(
    "\n  Re-run `npx tsx prisma/seed-banks.ts` to redistribute across levels.",
  );
}

/**
 * Keyed on (topicId, text): content is long-form prose, so an exact text match is
 * the natural identity and makes editing an explanation in the CSV a safe update.
 */
async function upsertQuestion(
  topicId: string,
  row: CsvQuestion,
): Promise<"created" | "updated" | "skipped"> {
  const existing = await prisma.question.findFirst({
    where: { topicId, text: row.text },
    select: { id: true, status: true },
  });

  const data = {
    options: row.options,
    correctOptions: [row.correct],
    explanation: row.explanation,
    difficulty: row.difficulty,
    tags: normaliseTags(row.tags ?? ""),
  };

  if (existing) {
    // Archived rows are revived rather than duplicated: content fixes should
    // bring a question back into circulation.
    if (existing.status === "ARCHIVED") {
      await prisma.question.update({
        where: { id: existing.id },
        data: { ...data, status: "PUBLISHED" },
      });
      return "updated";
    }
    return "updated";
  }

  await prisma.question.create({
    data: {
      topicId,
      // Left unassigned; the bank seeder places it into a topic + level bank.
      quizId: null,
      text: row.text,
      ...data,
      status: "PUBLISHED",
      position: 0,
    },
  });

  return "created";
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

main()
  .catch((error) => {
    console.error("\nContent seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
