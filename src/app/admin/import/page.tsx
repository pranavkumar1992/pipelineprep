import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { bulkImportAction } from "@/app/actions/admin";
import { AdminEditor, ASelect } from "@/components/admin/admin-forms";

export const metadata: Metadata = { title: "Bulk import" };

/**
 * Bulk question import (D-3).
 *
 * Paste CSV or JSON into one bank. The parser accepts several spellings for the
 * answer column and skips rows with the exact same question text already in the
 * bank, so a re-run is safe.
 */
export default async function AdminImportPage() {
  const banks = await prisma.quiz.findMany({
    where: { level: { not: null } },
    orderBy: [{ topic: { position: "asc" } }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      _count: { select: { questions: true } },
    },
  });

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Bulk import</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Add many questions to one bank at a time. Rows that fail validation are
          reported rather than silently dropped.
        </p>
      </div>

      <AdminEditor title="Import questions" action={bulkImportAction} defaultOpen>{
          <div className="space-y-4">
            <ASelect
              label="Target bank"
              name="quizSlug"
              required
              options={[
                { value: "", label: "Choose a bank" },
                ...banks.map((b) => ({
                  value: b.slug,
                  label: `${b.title} (${b._count.questions} questions)`,
                })),
              ]}
            />

            <div className="space-y-1.5">
              <label
                htmlFor="f-payload"
                className="block text-xs font-medium text-slate-400"
              >
                CSV or JSON
              </label>
              <textarea
                id="f-payload"
                name="payload"
                rows={14}
                required
                spellCheck={false}
                placeholder={
                  "question,options,correct,explanation,difficulty,tags\n" +
                  '"What does S3 versioning do?",["A","B","C","D"],0,"Explains versioning.",EASY,"storage"'
                }
                className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </div>
          </div>
        }
      </AdminEditor>

      <section className="rounded-xl border border-ink-700 bg-ink-900 p-6">
        <h2 className="font-semibold text-white">Accepted formats</h2>

        <h3 className="mt-5 font-mono text-xs uppercase tracking-wide text-slate-500">
          CSV
        </h3>
        <pre className="pp-code pp-scroll-x mt-2 overflow-x-auto rounded-lg border border-ink-800 bg-ink-950 p-4 text-slate-300">
{`question,options,correct,explanation,difficulty,tags
"What does a deny beat?",'["A","B","C","D"]',0,"Explicit deny wins.",EASY,"iam"`}
        </pre>
        <ul className="mt-3 space-y-1 text-sm text-slate-400">
          <li>
            <code className="font-mono text-brand-400">options</code> is a JSON
            array, or pipe separated, or one per line.
          </li>
          <li>
            <code className="font-mono text-brand-400">correct</code> accepts{" "}
            <code className="font-mono">B</code>,{" "}
            <code className="font-mono">2</code> or{" "}
            <code className="font-mono">1;3</code>.
          </li>
          <li>
            <code className="font-mono text-brand-400">explanation</code> must be
            at least 20 characters. This is the part that makes the product worth
            paying for, so it is enforced.
          </li>
          <li>
            <code className="font-mono text-brand-400">difficulty</code> defaults
            to MEDIUM.
          </li>
        </ul>

        <h3 className="mt-6 font-mono text-xs uppercase tracking-wide text-slate-500">
          JSON
        </h3>
        <pre className="pp-code pp-scroll-x mt-2 overflow-x-auto rounded-lg border border-ink-800 bg-ink-950 p-4 text-slate-300">
{`[
  {
    "question": "What does a deny beat?",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "Explicit deny wins.",
    "difficulty": "EASY",
    "tags": "iam"
  }
]`}
        </pre>
      </section>
    </div>
  );
}
