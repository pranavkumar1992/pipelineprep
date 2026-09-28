import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  deleteQuizAction,
  saveQuizAction,
} from "@/app/actions/admin";
import {
  ACheckbox,
  AInput,
  ASelect,
  ATextarea,
  AdminEditor,
  RowAction,
} from "@/components/admin/admin-forms";

export const metadata: Metadata = { title: "Quizzes" };

export default async function AdminQuizzesPage() {
  const [quizzes, topics] = await Promise.all([
    prisma.quiz.findMany({
      where: { level: { not: null } },
      orderBy: [{ topic: { position: "asc" } }, { level: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        level: true,
        isPremium: true,
        status: true,
        topic: { select: { name: true } },
        _count: { select: { questions: true } },
      },
    }),
    prisma.topic.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Quiz banks</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Banks are created automatically by the bank seeder. Add one by hand only
          when you need an extra topic-level bank.
        </p>
      </div>

      <AdminEditor title="New bank" action={saveQuizAction} defaultOpen>{
          <div className="space-y-4">
            <AInput label="Title" name="title" required placeholder="AWS - Beginner" />
            <ASelect
              label="Topic"
              name="topicId"
              required
              options={[
                { value: "", label: "Choose a topic" },
                ...topics.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
            <ATextarea label="Description" name="description" rows={2} />
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
                defaultValue="DRAFT"
                options={[
                  { value: "DRAFT", label: "Draft" },
                  { value: "PUBLISHED", label: "Published" },
                  { value: "ARCHIVED", label: "Archived" },
                ]}
              />
              <AInput
                label="Time limit (sec)"
                name="timeLimitSec"
                type="number"
                placeholder="Optional"
              />
            </div>
            <ACheckbox
              label="Premium"
              name="isPremium"
              hint="Beginner banks are usually free; Intermediate and Advanced are not."
            />
          </div>
        }
      </AdminEditor>

      <div className="overflow-hidden rounded-xl border border-ink-700">
        <div className="pp-scroll-x">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-ink-900">
              <tr>
                {["Bank", "Topic", "Level", "Access", "Status", "Questions", ""].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-slate-400"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800 bg-ink-950">
              {quizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{quiz.title}</span>
                    <code className="block font-mono text-xs text-slate-500">
                      {quiz.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{quiz.topic.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {quiz.level?.toLowerCase()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                        quiz.isPremium
                          ? "border-brand-400/30 bg-brand-400/10 text-brand-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {quiz.isPremium ? "Premium" : "Free"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {quiz.status.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {quiz._count.questions}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowAction
                      label="Delete"
                      action={deleteQuizAction}
                      fields={{ id: quiz.id }}
                      confirm={`Delete "${quiz.title}" and its questions?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-600 px-5 py-10 text-center text-sm text-slate-400">
          No banks yet. Run <code className="font-mono">npx tsx prisma/seed-banks.ts</code>.
        </p>
      ) : null}
    </div>
  );
}
