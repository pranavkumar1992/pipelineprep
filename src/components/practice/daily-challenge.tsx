"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Flame, Target, Trophy } from "lucide-react";
import { submitDailyChallengeAction } from "@/app/actions/daily";
import { cn } from "@/lib/utils";

type Props = {
  date: string;
  question: {
    id: string;
    text: string;
    options: string[];
    topicName: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    locked: boolean;
  } | null;
  scenario: { title: string; summary: string; slug: string } | null;
  attempt: { selectedOption: number; isCorrect: boolean } | null;
  streak: { current: number; longest: number; activeDays: number };
  stats: { completed: number; accuracyPct: number };
  todayAnswered: number;
  suggestedQuiz: { title: string; href: string } | null;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type AnswerState = {
  correct: boolean;
  correctOption: number;
  correctText: string;
  explanation: string;
};

export function DailyChallengeClient(props: Props) {
  const [selected, setSelected] = useState<number | null>(
    props.attempt?.selectedOption ?? null,
  );
  const [result, setResult] = useState(props.attempt);
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [streak, setStreak] = useState(props.streak);
  const [stats, setStats] = useState(props.stats);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = props.question?.locked ?? false;
  // Read-only for the rest of the day once submitted.
  const alreadyDone = result !== null;

  async function submit() {
    if (!props.question || selected === null) return;
    setSubmitting(true);
    setError(null);

    const res = await submitDailyChallengeAction({
      questionId: props.question.id,
      selectedOption: selected,
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setResult({ selectedOption: selected, isCorrect: res.correct });
    setAnswer({
      correct: res.correct,
      correctOption: res.correctOption,
      correctText: res.correctText,
      explanation: res.explanation,
    });
    setStreak(res.streak);
    setStats(res.stats);
  }

  return (
    <div className="space-y-8">
      {/* Stat tiles (addendum §4) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile
          icon={<Flame size={15} aria-hidden="true" />}
          label="Current streak"
          value={streak.current}
          suffix={streak.current === 1 ? "day" : "days"}
        />
        <Tile
          icon={<Trophy size={15} aria-hidden="true" />}
          label="Longest streak"
          value={streak.longest}
          suffix={streak.longest === 1 ? "day" : "days"}
        />
        <Tile
          icon={<Calendar size={15} aria-hidden="true" />}
          label="Completed"
          value={stats.completed}
          suffix={stats.completed === 1 ? "challenge" : "challenges"}
        />
        <Tile
          icon={<Target size={15} aria-hidden="true" />}
          label="Accuracy"
          value={stats.completed > 0 ? `${stats.accuracyPct}%` : "—"}
          suffix=""
        />
      </div>

      {/* Question card */}
      <section
        aria-labelledby="daily-question"
        className="rounded-2xl border border-ink-700 bg-ink-900 p-6 sm:p-8"
      >
        <h2 id="daily-question" className="sr-only">
          Today's question
        </h2>

        {locked ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-white">
              Today&apos;s challenge is a Premium question
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
              Upgrade to unlock every Daily Challenge, or practise the free
              Beginner banks on any topic.
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-flex h-11 items-center rounded-lg bg-brand-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
            >
              See Premium plans
            </Link>
          </div>
        ) : !props.question ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No Daily Challenge is available right now.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] uppercase tracking-wide">
              <span className="text-brand-400">{props.question.topicName}</span>
              <span className="text-slate-600">{props.question.difficulty}</span>
            </div>

            <p className="mt-4 text-lg font-medium leading-relaxed text-white sm:text-xl">
              {props.question.text}
            </p>

            <fieldset className="mt-6 space-y-2.5" disabled={alreadyDone}>
              <legend className="sr-only">Choose one answer</legend>
              {props.question.options.map((option, i) => {
                const isSelected = selected === i;
                // The correct option is only known after submitting, so it is
                // read from the answer state rather than the question payload.
                const isAnswer = alreadyDone && answer?.correctOption === i;

                return (
                  <label
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                      alreadyDone
                        ? isAnswer
                          ? "cursor-default border-mint-400/40 bg-mint-400/10 text-mint-200"
                          : isSelected && !result.isCorrect
                            ? "cursor-default border-rose-400/40 bg-rose-400/10 text-rose-200"
                            : "cursor-default border-ink-700 bg-ink-850 text-slate-500"
                        : "cursor-pointer border-ink-700 bg-ink-850 hover:border-ink-600 hover:bg-ink-800",
                      isSelected && !alreadyDone && "border-brand-400/50 bg-brand-400/5",
                    )}
                  >
                    <input
                      type="radio"
                      name="daily"
                      checked={isSelected}
                      onChange={() => setSelected(i)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[11px]",
                        alreadyDone && isAnswer
                          ? "border-mint-400 bg-mint-400 text-ink-950"
                          : alreadyDone && isSelected && !result.isCorrect
                            ? "border-rose-400 bg-rose-400 text-ink-950"
                            : isSelected
                              ? "border-brand-400 bg-brand-400 text-ink-950"
                              : "border-ink-600 text-slate-500",
                      )}
                    >
                      {alreadyDone && isAnswer
                        ? "\u2713"
                        : alreadyDone && isSelected && !result.isCorrect
                          ? "\u2715"
                          : LETTERS[i]}
                    </span>
                    <span className="flex-1 leading-relaxed">{option}</span>
                  </label>
                );
              })}
            </fieldset>

            {!alreadyDone ? (
              <button
                type="button"
                disabled={selected === null || submitting}
                onClick={submit}
                className={cn(
                  "mt-6 w-full rounded-lg px-5 py-3 text-sm font-semibold transition-colors",
                  selected === null
                    ? "cursor-not-allowed bg-ink-800 text-slate-600"
                    : "cursor-pointer bg-brand-400 text-ink-950 hover:bg-brand-500",
                )}
              >
                {submitting ? "Submitting…" : "Submit answer"}
              </button>
            ) : null}

            {error ? (
              <p role="alert" className="mt-4 text-sm text-rose-400">
                {error}
              </p>
            ) : null}

            {alreadyDone && answer ? (
              <div
                role="status"
                className={cn(
                  "mt-6 rounded-lg border p-4",
                  answer.correct
                    ? "border-mint-400/30 bg-mint-400/5"
                    : "border-amber-450/30 bg-amber-450/5",
                )}
              >
                <p
                  className={cn(
                    "font-semibold",
                    answer.correct ? "text-mint-300" : "text-amber-300",
                  )}
                >
                  {answer.correct
                    ? "Correct. Streak updated."
                    : `Incorrect. The answer is: ${answer.correctText}`}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {answer.explanation}
                </p>
              </div>
            ) : null}

            {alreadyDone && !answer ? (
              <p className="mt-6 rounded-lg border border-ink-700 bg-ink-850 p-4 text-sm text-slate-400">
                You already completed today&apos;s challenge. Come back tomorrow
                for a new one.
              </p>
            ) : null}
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bonus scenario */}
        <section
          aria-labelledby="bonus-scenario"
          className="rounded-2xl border border-ink-700 bg-ink-900 p-6"
        >
          <h2
            id="bonus-scenario"
            className="font-mono text-xs uppercase tracking-wider text-brand-400"
          >
            Today&apos;s bonus scenario
          </h2>
          {props.scenario ? (
            <>
              <p className="mt-3 font-semibold text-white">{props.scenario.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {props.scenario.summary}
              </p>
              <Link
                href={`/scenarios/${props.scenario.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-400 hover:underline"
              >
                Open
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              No bonus scenario today.
            </p>
          )}
        </section>

        {/* Suggested quiz */}
        <section
          aria-labelledby="want-more"
          className="rounded-2xl border border-ink-700 bg-ink-900 p-6"
        >
          <h2
            id="want-more"
            className="font-mono text-xs uppercase tracking-wider text-slate-500"
          >
            Want more practice?
          </h2>
          {props.suggestedQuiz ? (
            <>
              <p className="mt-3 font-semibold text-white">
                {props.suggestedQuiz.title}
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                One question is a small sample. A full bank gives you twenty.
              </p>
              <Link
                href={props.suggestedQuiz.href}
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-400 hover:underline"
              >
                Practise this bank
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-slate-400">
                Browse the question bank and pick a topic.
              </p>
              <Link
                href="/quizzes"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-400 hover:underline"
              >
                Browse quizzes
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </>
          )}
        </section>
      </div>

      {props.todayAnswered > 0 ? (
        <p className="text-center text-xs text-slate-600">
          You have answered {props.todayAnswered} question
          {props.todayAnswered === 1 ? "" : "s"} today.
        </p>
      ) : null}
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  suffix: string;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
      <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">
        <span aria-hidden="true" className="text-brand-400">
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold text-white">
        {value}
        {suffix ? (
          <span className="ml-1 text-xs font-normal text-slate-500">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}
