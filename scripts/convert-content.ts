import { readFileSync, writeFileSync } from "node:fs";

/**
 * Extracts the question bank into JSON.
 *
 * The content was authored as CSV where the options column is a JSON array
 * nested inside a CSV-quoted field. Reconciling those two layers of quoting
 * proved fragile and left the source with inconsistent escaping, so this script
 * does not attempt to parse CSV at all.
 *
 * It relies on two properties of the data that are easy to verify:
 *
 *  1. Every option is quote-wrapped, so options are separated by exactly
 *     `", "` once escaping is collapsed. No option text contains that sequence.
 *  2. The remaining columns are located positionally: the topic precedes the
 *     first comma, the text precedes `,"[`, the correct-answer index follows
 *     the array's closing bracket, and difficulty and tags are the last two
 *     fields on the line.
 *
 * Every row is validated, and any row that fails is reported with its line
 * number rather than silently dropped.
 *
 * Content lives in more than one file so batches can be reviewed and reverted
 * independently. Every source is merged into one topic-keyed output; a topic
 * present in more than one batch has its rows concatenated.
 *
 * Run:
 *   npx tsx scripts/convert-content.ts
 */

import { BATCH_TWO } from "../prisma/seed-data/content-batch-two";

/**
 * Source files in the order they should be merged. Later batches append to a
 * topic rather than replacing it.
 *
 * `content-volume.ts` is read as text rather than imported, because its CSV
 * blocks are template literals that the converter parses itself.
 */
const SOURCES: Array<{ label: string; blocks: Record<string, string> }> = [
  {
    label: "batch-1",
    blocks: Object.fromEntries(
      [...readFileSync("prisma/seed-data/content-volume.ts", "utf8").matchAll(
        /FILES\["([a-z-]+)"\]\s*=\s*`([\s\S]*?)`;/g,
      )].map((match) => [match[1]!, match[2]!]),
    ),
  },
  { label: "batch-2", blocks: BATCH_TWO },
];

const TARGET = "prisma/seed-data/content-volume.json";

const VALID = new Set(["EASY", "MEDIUM", "HARD"]);

/**
 * Legacy slug aliases.
 *
 * The first batch was written before topic slugs were settled and uses `cicd`
 * where the topic row is `ci-cd`. Without this the seeder's on-demand topic
 * creation quietly adds a duplicate "Cicd" topic and its questions split across
 * two topics, leaving the bank grid with a stray entry.
 */
const SLUG_ALIASES: Record<string, string> = {
  cicd: "ci-cd",
};

function normaliseSlug(slug: string): string {
  const trimmed = slug.trim().toLowerCase();
  return SLUG_ALIASES[trimmed] ?? trimmed;
}

/** Collapses CSV escaping and trims a raw field. */
function clean(raw: string): string {
  let value = raw.trim();
  if (value.startsWith('"')) value = value.slice(1);
  if (value.endsWith('"')) value = value.slice(0, -1);
  return value.replace(/""/g, '"').trim();
}

function parseRow(line: string): {
  topic: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: string;
  tags: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Topic: everything before the first comma.
  const firstComma = trimmed.indexOf(",");
  if (firstComma <= 0) return null;
  const topic = trimmed.slice(0, firstComma).trim();

  // The options array always opens with `,"[`.
  const optionsMarker = trimmed.indexOf(',"[');
  if (optionsMarker === -1) return null;

  const text = clean(trimmed.slice(firstComma + 1, optionsMarker));
  if (!text) return null;

  // Array body: from `[` to the first `]` after the marker. With the escaping
  // collapsed, options are separated by `", "`, so splitting on it is exact.
  const body = trimmed.slice(optionsMarker + 3);
  const close = body.indexOf("]");
  if (close === -1) return null;

  const options = body
    .slice(0, close)
    .replace(/""/g, '"')
    .split('", "')
    .map((option) => option.replace(/^"|"$/g, "").trim())
    .filter(Boolean);

  // Correct-answer index sits immediately after the closing bracket.
  const afterBracket = trimmed.slice(optionsMarker + 3 + close + 1);
  const correctMatch = /^\s*"?\s*,?\s*(\d+)\s*,/.exec(afterBracket);
  if (!correctMatch) return null;
  const correct = Number.parseInt(correctMatch[1]!, 10);

  // Difficulty and tags are the final two fields; the explanation is between
  // the correct-answer column and difficulty.
  const tailMatch = /,([A-Za-z]+)\s*,\s*([A-Za-z0-9,\-]*)\s*$/.exec(afterBracket);
  if (!tailMatch) return null;

  const explanationStart = afterBracket.indexOf(",", correctMatch[0].length - 1) + 1;
  if (explanationStart <= 0) return null;

  const explanation = clean(
    afterBracket.slice(explanationStart, tailMatch.index),
  );

  return {
    topic,
    text,
    options,
    correct,
    explanation,
    difficulty: tailMatch[1]!.toUpperCase(),
    tags: tailMatch[2]!.trim(),
  };
}

const out: Record<string, unknown[]> = {};
let totalSource = 0;
let totalKept = 0;
let failed = 0;

for (const { label, blocks } of SOURCES) {
  const entries = Object.entries(blocks);

  if (entries.length === 0) {
    console.error(`No CSV blocks found in ${label}.`);
    process.exit(1);
  }

  for (const [slug, body] of entries) {
    const lines = body.trim().split("\n").filter((l) => l.trim().length > 0);
    lines.shift(); // header

    totalSource += lines.length;

    const kept: unknown[] = [];

    for (const [index, line] of lines.entries()) {
      const row = parseRow(line);

      if (!row) {
        console.log(`  ${label}/${slug} line ${index + 2}: unreadable row`);
        failed += 1;
        continue;
      }

      const problems: string[] = [];
      if (row.options.length < 2) problems.push(`options=${row.options.length}`);
      if (
        !Number.isInteger(row.correct) ||
        row.correct < 0 ||
        row.correct >= row.options.length
      ) {
        problems.push(`correct=${row.correct}`);
      }
      if (row.explanation.length < 20) problems.push("explanation too short");
      if (!VALID.has(row.difficulty)) problems.push(`difficulty="${row.difficulty}"`);
      if (row.tags.includes("unused")) problems.push("placeholder");

      if (problems.length > 0) {
        console.log(
          `  ${label}/${slug} line ${index + 2}: skipped (${problems.join("; ")})`,
        );
        failed += 1;
        continue;
      }

      kept.push({ ...row, topic: row.topic || slug });
    }

    // Merge on the row's own topic, not the block name. Block names and topic
    // slugs have drifted apart over time, and keying on the block silently
    // split one topic across two output keys.
    for (const row of kept as Array<{ topic: string }>) {
      const topic = normaliseSlug(row.topic || slug);
      const existing = out[topic] ?? [];
      existing.push({ ...row, topic });
      out[topic] = existing;
    }

    totalKept += kept.length;
    console.log(
      `${label}/${slug}`.padEnd(24) +
        ` kept ${String(kept.length).padStart(3)} of ${lines.length}`,
    );
  }
}

// Duplicate question text within a topic would create two identical rows, since
// the seeder upserts on (topicId, text) and the second would just overwrite the
// first. Report rather than silently drop, so an authoring mistake is visible.
for (const [slug, rows] of Object.entries(out)) {
  const seen = new Map<string, number>();
  const deduped: unknown[] = [];

  for (const row of rows as Array<{ text: string }>) {
    const key = row.text.trim().toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) deduped.push(row);
    else console.log(`  ${slug}: dropped duplicate question text`);
  }

  out[slug] = deduped;
}

const ordered = Object.fromEntries(
  Object.entries(out).sort(([a], [b]) => a.localeCompare(b)),
);

writeFileSync(TARGET, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");
console.log(`\nTotal kept ${totalKept} of ${totalSource} rows, ${failed} rejected`);
console.log(`Wrote ${TARGET}`);
