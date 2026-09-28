import Link from "next/link";
import { getBankGrid, getModeAvailability } from "@/lib/banks";
import {
  MOCK_TEST_SECONDS,
  QUESTIONS_PER_ATTEMPT,
  QUICK_PRACTICE_QUESTIONS,
} from "@/lib/practice-config";
import { PracticeModeCards } from "@/components/practice/mode-cards";
import { BankGrid } from "@/components/practice/bank-grid";
import { requireUser } from "@/lib/auth/session";

export default async function QuizzesPage() {
  // The bank grid is per-user (progress and locks), so this page is dynamic.
  await requireUser("/quizzes");

  const [{ sections, isPremium }, availability] = await Promise.all([
    getBankGrid(),
    getModeAvailability(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Quizzes
        </h1>
        <p className="mt-2 text-slate-400">
          Pick a topic, tier, and level. Each attempt draws {QUESTIONS_PER_ATTEMPT}{" "}
          random questions, with no repeats within an attempt.
        </p>
      </header>

      <section aria-labelledby="modes-heading" className="mt-8">
        <h2 id="modes-heading" className="sr-only">
          Practice modes
        </h2>
        <PracticeModeCards availability={availability} />
      </section>

      <section aria-labelledby="topics-heading" className="mt-14">
        <h2
          id="topics-heading"
          className="font-mono text-xs uppercase tracking-wider text-slate-500"
        >
          Topic banks
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {isPremium
            ? "Premium: every level unlocked, including new banks as they are added."
            : "Beginner is free on every topic. Intermediate and Advanced unlock with Premium."}
        </p>

        <div className="mt-6 space-y-10">
          {sections.map((section) => (
            <BankGrid key={section.topic.id} section={section} />
          ))}
        </div>
      </section>

      <aside className="mt-14 rounded-xl border border-ink-700 bg-ink-900 p-6">
        <h2 className="font-semibold text-white">Prefer incident practice?</h2>
        <p className="mt-2 text-sm text-slate-400">
          Scenarios walk you through a real troubleshooting session step by step,
          with the commands, the root cause and how to stop it recurring.{" "}
          <Link
            href="/scenarios"
            className="text-brand-400 underline underline-offset-4"
          >
            Browse scenarios
          </Link>
          .
        </p>
        <p className="mt-3 font-mono text-xs text-slate-500">
          Mixed Mock Test runs {Math.round(MOCK_TEST_SECONDS / 60)} minutes over
          every topic. Quick Practice is {QUICK_PRACTICE_QUESTIONS} questions, no
          setup.
        </p>
      </aside>
    </div>
  );
}
