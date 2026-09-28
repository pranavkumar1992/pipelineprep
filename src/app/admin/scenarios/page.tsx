import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  addScenarioStepAction,
  deleteScenarioAction,
  deleteScenarioStepAction,
  saveScenarioAction,
} from "@/app/actions/admin";
import {
  ACheckbox,
  AInput,
  ASelect,
  ATextarea,
  AdminEditor,
  RowAction,
} from "@/components/admin/admin-forms";

export const metadata: Metadata = { title: "Scenarios" };

export default async function AdminScenariosPage() {
  const [scenarios, topics] = await Promise.all([
    prisma.scenario.findMany({
      orderBy: [{ topic: { position: "asc" } }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        isPremium: true,
        status: true,
        topic: { select: { name: true } },
        _count: { select: { steps: true } },
        steps: {
          orderBy: { order: "asc" },
          select: { id: true, order: true, prompt: true },
        },
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
        <h1 className="text-2xl font-bold tracking-tight text-white">Scenarios</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Each scenario is a guided walkthrough. Steps are revealed one at a time
          to the learner, so order matters.
        </p>
      </div>

      <AdminEditor title="New scenario" action={saveScenarioAction} defaultOpen>{
          <div className="space-y-4">
            <AInput label="Title" name="title" required placeholder="ALB returning 502 intermittently" />
            <ASelect
              label="Topic"
              name="topicId"
              required
              options={[
                { value: "", label: "Choose a topic" },
                ...topics.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
            <ATextarea label="Summary" name="summary" required rows={2} />
            <ATextarea
              label="Context"
              name="context"
              required
              rows={5}
              hint="The situation and architecture. Plain prose, blank line between paragraphs."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ATextarea label="Symptoms" name="symptoms" required rows={4} hint="One per line, starting with -" />
              <ATextarea label="Environment" name="environment" required rows={4} hint="One per line, starting with -" />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
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
              <AInput label="Duration (min)" name="durationMin" type="number" />
              <AInput label="Tags" name="tags" placeholder="networking, incident" />
            </div>
            <ACheckbox label="Premium" name="isPremium" />
            <ATextarea label="Root cause" name="rootCause" rows={3} />
            <ATextarea label="Fix" name="fix" rows={3} />
            <ATextarea label="Prevention" name="prevention" rows={3} />
          </div>
        }
      </AdminEditor>

      <div className="space-y-4">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="rounded-xl border border-ink-700 bg-ink-900 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-white">{scenario.title}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {scenario.topic.name} &middot; {scenario.difficulty.toLowerCase()}{" "}
                  &middot; {scenario.isPremium ? "premium" : "free"} &middot;{" "}
                  {scenario.status.toLowerCase()} &middot; {scenario._count.steps} steps
                </p>
                <code className="mt-1 block font-mono text-xs text-slate-600">
                  /scenarios/{scenario.slug}
                </code>
              </div>
              <RowAction
                label="Delete scenario"
                action={deleteScenarioAction}
                fields={{ id: scenario.id }}
                confirm={`Delete "${scenario.title}" and its steps?`}
              />
            </div>

            <ol className="mt-4 space-y-1.5">
              {scenario.steps.map((step) => (
                <li
                  key={step.id}
                  className="flex items-start gap-3 rounded-lg border border-ink-800 bg-ink-850 px-3 py-2"
                >
                  <span className="shrink-0 font-mono text-xs text-slate-500">
                    {step.order}
                  </span>
                  <span className="flex-1 text-sm text-slate-300">
                    {step.prompt}
                  </span>
                  <span className="shrink-0">
                    <RowAction
                      label="x"
                      action={deleteScenarioStepAction}
                      fields={{ id: step.id }}
                      confirm="Delete this step?"
                    />
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-4">
              <AdminEditor
                title="Add a step"
                action={addScenarioStepAction}
              >{
                  <div className="space-y-4">
                    <input type="hidden" name="scenarioId" value={scenario.id} />
                    <ATextarea
                      label="Prompt"
                      name="prompt"
                      required
                      rows={2}
                      hint="Ask what the engineer would check next."
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`f-options-${scenario.id}`}
                          className="block text-xs font-medium text-slate-400"
                        >
                          Options (one per line, optional)
                        </label>
                        <textarea
                          id={`f-options-${scenario.id}`}
                          name="options"
                          rows={3}
                          className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`f-correct-${scenario.id}`}
                          className="block text-xs font-medium text-slate-400"
                        >
                          Correct option (1-based)
                        </label>
                        <input
                          id={`f-correct-${scenario.id}`}
                          name="correctOptions"
                          placeholder="1"
                          className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                        />
                      </div>
                    </div>
                    <ATextarea
                      label="Reasoning"
                      name="reasoning"
                      required
                      rows={3}
                      hint="Why that is the right next step, and what it rules out."
                    />
                    <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                      <AInput label="Language" name="codeLanguage" placeholder="bash" />
                      <ATextarea label="Command" name="codeBlock" rows={3} />
                    </div>
                  </div>
                  }
                </AdminEditor>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
