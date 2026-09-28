import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  deleteQuestionAction,
  resolveReportAction,
  saveQuestionAction,
} from "@/app/actions/admin";
import {
  AInput,
  ASelect,
  ATextarea,
  AdminEditor,
  RowAction,
} from "@/components/admin/admin-forms";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Questions" };

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;

  const [topics, banks, questions, reports] = await Promise.all([
    prisma.topic.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    }),
    prisma.quiz.findMany({
      where: { level: { not: null }, status: "PUBLISHED" },
      orderBy: [{ topic: { position: "asc" } }, { title: "asc" }],
      select: { id: true, title: true, topic: { select: { id: true } } },
    }),
    prisma.question.findMany({
      where: topic ? { topic: { slug: topic } } : {},
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: {
        id: true,
        text: true,
        difficulty: true,
        topic: { select: { name: true } },
        quiz: { select: { title: true } },
        _count: { select: { userStates: true } },
      },
    }),
    prisma.questionReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { email: true } },
        question: { select: { text: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Questions</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Add questions by hand, or use bulk import for larger batches. Every
          answer needs a written explanation of at least 20 characters.
        </p>
      </div>

      {reports.length > 0 ? (
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
          <h2 className="font-semibold text-amber-200">
            {reports.length} open report{reports.length === 1 ? "" : "s"}
          </h2>
          <ul className="mt-4 space-y-3">
            {reports.map((report) => (
              <li
                key={report.id}
                className="rounded-lg border border-ink-700 bg-ink-900 p-4"
              >
                <p className="text-sm text-slate-300">
                  <span className="font-mono text-xs uppercase text-amber-300">
                    {report.reason.replace(/_/g, " ")}
                  </span>{" "}
                  &mdash; {report.question.text.slice(0, 120)}
                </p>
                <p className="mt-1.5 text-xs text-slate-500">
                  {report.user.email} &middot;{" "}
                  {formatDateTime(report.createdAt)}
                  {report.details ? ` · ${report.details}` : ""}
                </p>
                <div className="mt-3">
                  <RowAction
                    label="Mark resolved"
                    action={resolveReportAction}
                    fields={{ id: report.id }}
                    variant="secondary"
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AdminEditor title="Add a question" action={saveQuestionAction} defaultOpen>{
          <div className="space-y-4">
            <ASelect
              label="Bank"
              name="quizId"
              hint="Optional. Picks the topic automatically."
              options={[
                { value: "", label: "No bank (loose question)" },
                ...banks.map((b) => ({ value: b.id, label: b.title })),
              ]}
            />
            <ASelect
              label="Topic"
              name="topicId"
              required
              options={[
                { value: "", label: "Choose a topic" },
                ...topics.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
            <ATextarea label="Question" name="text" required rows={2} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="f-options"
                  className="block text-xs font-medium text-slate-400"
                >
                  Options (one per line)
                </label>
                <textarea
                  id="f-options"
                  name="options"
                  rows={4}
                  required
                  placeholder={"First option\nSecond option\nThird option\nFourth option"}
                  className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="f-correctOptions"
                  className="block text-xs font-medium text-slate-400"
                >
                  Correct option (1-based, one per line)
                </label>
                <textarea
                  id="f-correctOptions"
                  name="correctOptions"
                  rows={4}
                  required
                  placeholder={"2"}
                  className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                />
              </div>
            </div>

            <ATextarea
              label="Explanation"
              name="explanation"
              required
              rows={4}
              hint="Say why the answer is right and why the distractors are wrong."
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <ASelect
                label="Difficulty"
                name="difficulty"
                defaultValue="MEDIUM"
                options={[
                  { value: "EASY", label: "Easy" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HARD", label: "Hard" },
                ]}
              />
              <ASelect
                label="Status"
                name="status"
                defaultValue="PUBLISHED"
                options={[
                  { value: "DRAFT", label: "Draft" },
                  { value: "PUBLISHED", label: "Published" },
                  { value: "ARCHIVED", label: "Archived" },
                ]}
              />
              <AInput
                label="Tags"
                name="tags"
                placeholder="interview, storage"
                hint="Comma separated."
              />
            </div>
          </div>
        }
      </AdminEditor>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/questions"
          className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${
            !topic
              ? "border-brand-400/50 bg-brand-400/10 text-brand-400"
              : "border-ink-700 text-slate-400"
          }`}
        >
          All
        </Link>
        {topics.map((t) => (
          <Link
            key={t.id}
            href={`/admin/questions?topic=${slugify(t.name)}`}
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${
              topic === slugify(t.name)
                ? "border-brand-400/50 bg-brand-400/10 text-brand-400"
                : "border-ink-700 text-slate-400"
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      <ul className="space-y-2">
        {questions.map((question) => (
          <li
            key={question.id}
            className="rounded-xl border border-ink-700 bg-ink-900 p-4"
          >
            <p className="text-sm text-white">{question.text}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500">
              <span>{question.topic.name}</span>
              <span>&middot;</span>
              <span>{question.quiz?.title ?? "No bank"}</span>
              <span>&middot;</span>
              <span>{question.difficulty.toLowerCase()}</span>
              <span>&middot;</span>
              <span>{question._count.userStates} answered</span>
              <span className="ml-auto">
                <RowAction
                  label="Delete"
                  action={deleteQuestionAction}
                  fields={{ id: question.id }}
                  confirm="Delete this question? Attempts that referenced it keep their score."
                />
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
