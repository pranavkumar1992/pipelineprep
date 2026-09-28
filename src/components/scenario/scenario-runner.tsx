"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { saveScenarioProgressAction } from "@/app/actions/scenario";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CodeBlocks,
  ScenarioProse,
  type CodeBlock,
  type ScenarioStepShape,
} from "./scenario-prose";

const LETTERS = ["A", "B", "C", "D", "E"];

export type ScenarioDetail = {
  id: string;
  title: string;
  summary: string;
  context: string;
  symptoms: string;
  environment: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isPremium: boolean;
  tags: string[];
  durationMin: number | null;
  rootCause: string | null;
  fix: string | null;
  prevention: string | null;
  topic: { name: string; slug: string };
  steps: ScenarioStepShape[];
  /** Steps already revealed, when resuming from saved progress. */
  initialStep: number;
};

type Phase = "brief" | "investigating" | "resolved";

export function ScenarioRunner({ scenario }: { scenario: ScenarioDetail }) {
  const [phase, setPhase] = useState<Phase>("brief");
  const [stepIndex, setStepIndex] = useState(scenario.initialStep);
  const [revealed, setRevealed] = useState<number>(scenario.initialStep);
  const [chosen, setChosen] = useState<Record<number, number[]>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const totalSteps = scenario.steps.length;
  const progress = (revealed / totalSteps) * 100;

  const current = scenario.steps[stepIndex];

  /** Persists progress server-side so a refresh resumes where the user left off. */
  const persist = useCallback(
    async (step: number, completed: boolean) => {
      setSaved("saving");
      const result = await saveScenarioProgressAction({
        scenarioId: scenario.id,
        step,
        completed,
      });
      setSaved(result.ok ? "saved" : "error");
    },
    [scenario.id],
  );

  // Keep a ref of the latest persist function so the step advance handler can
  // fire-and-forget without being re-created on every render.
  const persistRef = useRef(persist);
  persistRef.current = persist;

  /** Steps revealed so far; locked ones are never sent to the client. */
  const visibleSteps = useMemo(
    () => scenario.steps.slice(0, revealed),
    [scenario.steps, revealed],
  );

  return (
    <div className="space-y-8">
      {/* Brief */}
      {phase === "brief" ? (
        <section className="space-y-6">
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-brand-400">
              The situation
            </h2>
            <ScenarioProse text={scenario.context} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-rose-400">
                What you are seeing
              </h3>
              <ScenarioProse text={scenario.symptoms} />
            </div>
            <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-slate-500">
                Environment
              </h3>
              <ScenarioProse text={scenario.environment} />
            </div>
          </div>

          <div className="rounded-xl border border-brand-400/25 bg-brand-400/5 p-6">
            <p className="text-sm leading-relaxed text-slate-300">
              Work through this the way you would on call: decide what to check
              next, commit to an answer, then see what a senior engineer would
              say and why. There is no scoring, but the reasoning is the point.
            </p>
            <Button
              className="mt-5"
              onClick={() => {
                setPhase("investigating");
                void persistRef.current(0, false);
              }}
            >
              Start investigating
            </Button>
          </div>
        </section>
      ) : null}

      {/* Investigation */}
      {phase === "investigating" ? (
        <section className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs text-slate-500">
              <span>
                Step {Math.min(stepIndex + 1, totalSteps)} of {totalSteps}
              </span>
              <span>{Math.round(progress)}% investigated</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-ink-800"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalSteps}
              aria-valuenow={revealed}
              aria-label="Investigation progress"
            >
              <div
                className="h-full rounded-full bg-brand-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Previously revealed steps stay visible for context. */}
          {visibleSteps.slice(0, Math.max(0, stepIndex)).map((step) => (
            <StepBlock
              key={step.id}
              step={step}
              chosen={chosen[step.order - 1]}
              checked={checked[step.order - 1]}
              locked
            />
          ))}

          {current ? (
            <StepBlock
              step={current}
              chosen={chosen[current.order - 1]}
              checked={checked[current.order - 1]}
              onChoose={(indexes) =>
                setChosen((prev) => ({ ...prev, [current.order - 1]: indexes }))
              }
              onCommit={(isCorrect) => {
                setChecked((prev) => ({
                  ...prev,
                  [current.order - 1]: isCorrect,
                }));
                setRevealed((r) => Math.max(r, current.order));
                void persistRef.current(current.order, false);
              }}
              action={
                revealed >= current.order ? (
                  <Button
                    onClick={() => {
                      if (stepIndex + 1 < totalSteps) {
                        setStepIndex((i) => i + 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        setPhase("resolved");
                        // Mark complete only once the final step is revealed.
                        void persistRef.current(totalSteps, true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                  >
                    {stepIndex + 1 < totalSteps ? "Next step" : "See resolution"}
                  </Button>
                ) : null
              }
            />
          ) : null}
        </section>
      ) : null}

      {/* Resolution */}
      {phase === "resolved" ? (
        <section className="space-y-6">
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-brand-400">
              The investigation
            </h2>
            <div className="mt-4 space-y-4">
              {scenario.steps.map((step) => (
                <StepBlock
                  key={step.id}
                  step={step}
                  chosen={chosen[step.order - 1]}
                  checked={checked[step.order - 1]}
                  locked
                />
              ))}
            </div>
          </div>

          <OutcomeCard
            title="Root cause"
            text={scenario.rootCause}
            tone="rose"
          />
          <OutcomeCard title="The fix" text={scenario.fix} tone="brand" />
          <OutcomeCard title="Prevention" text={scenario.prevention} tone="mint" />

          <p
            className="text-center font-mono text-xs text-slate-500"
            role="status"
            aria-live="polite"
          >
            {saved === "saving"
              ? "Saving progress…"
              : saved === "saved"
                ? "Progress saved to your dashboard"
                : saved === "error"
                  ? "Could not save progress. Your history will still be correct in this session."
                  : ""}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/scenarios"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 px-5 text-sm font-medium text-slate-200 transition-colors hover:bg-ink-700"
            >
              More scenarios
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-slate-400 transition-colors hover:bg-ink-800 hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepBlock({
  step,
  chosen,
  checked,
  locked = false,
  onChoose,
  onCommit,
  action,
}: {
  step: ScenarioStepShape;
  chosen?: number[];
  checked?: boolean;
  locked?: boolean;
  onChoose?: (indexes: number[]) => void;
  onCommit?: (isCorrect: boolean) => void;
  action?: React.ReactNode;
}) {
  const hasOptions = step.options.length > 0;
  const codeBlocks = normaliseCodeBlocks(step.codeBlocks);
  const revealed = checked !== undefined;

  function commit() {
    if (!onCommit || !chosen) return;
    const answerKey = [...step.correctOptions].sort((a, b) => a - b);
    const given = [...new Set(chosen)].sort((a, b) => a - b);
    onCommit(
      answerKey.length === given.length &&
        answerKey.every((value, index) => value === given[index]),
    );
  }

  return (
    <article className="rounded-xl border border-ink-700 bg-ink-900 p-6">
      <p className="font-mono text-[11px] uppercase tracking-wide text-slate-600">
        Step {step.order}
      </p>
      <h3 className="mt-2.5 text-base font-medium leading-relaxed text-white">
        {step.prompt}
      </h3>

      {hasOptions ? (
        <fieldset className="mt-5 space-y-2.5" disabled={revealed}>
          <legend className="sr-only">
            What would you check next? Choose your answer.
          </legend>
          {step.options.map((option, i) => {
            const isChosen = chosen?.includes(i) ?? false;
            const isAnswer = step.correctOptions.includes(i);
            const isWrongPick = revealed && isChosen && !isAnswer;

            return (
              <label
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                  revealed
                    ? isAnswer
                      ? "cursor-default border-mint-400/40 bg-mint-400/10 text-mint-200"
                      : isWrongPick
                        ? "cursor-default border-rose-400/40 bg-rose-400/10 text-rose-200"
                        : "cursor-default border-ink-700 bg-ink-850 text-slate-500"
                    : "cursor-pointer border-ink-700 bg-ink-850 hover:border-ink-600 hover:bg-ink-800",
                  isChosen && !revealed && "border-brand-400/50 bg-brand-400/5",
                )}
              >
                <input
                  type="checkbox"
                  checked={isChosen}
                  onChange={(e) => {
                    const checkedNow = e.target.checked;
                    onChoose?.(
                      checkedNow
                        ? [...(chosen ?? []), i]
                        : (chosen ?? []).filter((x) => x !== i),
                    );
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[11px]",
                    revealed && isAnswer
                      ? "border-mint-400 bg-mint-400 text-ink-950"
                      : revealed && isWrongPick
                        ? "border-rose-400 bg-rose-400 text-ink-950"
                        : isChosen
                          ? "border-brand-400 bg-brand-400 text-ink-950"
                          : "border-ink-600 text-slate-500",
                  )}
                >
                  {revealed && isAnswer
                    ? "\u2713"
                    : revealed && isWrongPick
                      ? "\u2715"
                      : LETTERS[i]}
                </span>
                <span className="flex-1 leading-relaxed">{option}</span>
              </label>
            );
          })}
        </fieldset>
      ) : null}

      {!revealed && hasOptions && onCommit ? (
        <Button
          className="mt-5"
          onClick={commit}
          disabled={!chosen || chosen.length === 0}
        >
          Reveal the reasoning
        </Button>
      ) : null}

      {!revealed && !hasOptions ? (
        <Button className="mt-5" onClick={() => onCommit?.(true)}>
          Reveal the reasoning
        </Button>
      ) : null}

      {revealed ? (
        <div
          className={cn(
            "mt-5 rounded-lg border p-4",
            checked
              ? "border-mint-400/30 bg-mint-400/5"
              : "border-amber-450/30 bg-amber-450/5",
          )}
          role="status"
        >
          <p
            className={cn(
              "font-semibold",
              checked ? "text-mint-300" : "text-amber-300",
            )}
          >
            {checked
              ? hasOptions
                ? "Good call."
                : "Reasoning"
              : hasOptions
                ? "Reasonable, but not quite"
                : "Reasoning"}
          </p>
          <div className="mt-2">
            <ScenarioProse text={step.reasoning} />
          </div>
          {codeBlocks.length > 0 ? (
            <div className="mt-4">
              <CodeBlocks blocks={codeBlocks} />
            </div>
          ) : null}
        </div>
      ) : null}

      {revealed && action ? <div className="mt-5">{action}</div> : null}
      {locked && !action ? null : null}
    </article>
  );
}

function OutcomeCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string | null;
  tone: "rose" | "brand" | "mint";
}) {
  if (!text) return null;

  const tones = {
    rose: "border-rose-450/25 text-rose-400",
    brand: "border-brand-400/25 text-brand-400",
    mint: "border-mint-400/25 text-mint-400",
  } as const;

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
      <h2 className={cn("font-mono text-xs uppercase tracking-wider", tones[tone])}>
        {title}
      </h2>
      <div className="mt-3">
        <ScenarioProse text={text} />
      </div>
    </div>
  );
}

/** Narrows the Json column to our CodeBlock shape, dropping anything malformed. */
function normaliseCodeBlocks(value: unknown): CodeBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (
      typeof entry === "object" &&
      entry !== null &&
      "code" in entry &&
      typeof (entry as { code: unknown }).code === "string"
    ) {
      const record = entry as {
        code: string;
        language?: unknown;
        caption?: unknown;
      };
      return [
        {
          code: record.code,
          language: typeof record.language === "string" ? record.language : "text",
          caption: typeof record.caption === "string" ? record.caption : undefined,
        },
      ];
    }
    return [];
  });
}
