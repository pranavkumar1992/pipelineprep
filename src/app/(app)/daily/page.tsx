import type { Metadata } from "next";
import Link from "next/link";
import { getDailyChallenge } from "@/lib/daily-challenge";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { DailyChallengeClient } from "@/components/practice/daily-challenge";

export const metadata: Metadata = {
  title: "Daily Challenge",
  description:
    "One DevOps question every day. Complete it to keep your streak alive.",
  alternates: { canonical: "/daily" },
  robots: { index: false, follow: true },
};

export default async function DailyPage() {
  const user = await requireUser("/daily");

  const [daily, suggestedBank] = await Promise.all([
    getDailyChallenge(),
    prisma.quiz.findFirst({
      where: { status: "PUBLISHED", level: "BEGINNER" },
      orderBy: { topic: { position: "asc" } },
      select: { id: true, title: true, isPremium: true, topic: { select: { slug: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-brand-400">
          Daily Challenge
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          One question. Every day.
        </h1>
        <p className="mt-2 text-sm text-slate-400">{daily.date}</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          Complete it or hit your daily goal and your streak moves on. Miss a
          day and it resets to zero.{" "}
          <Link href="/dashboard/settings" className="text-brand-400 underline underline-offset-4">
            Change your goal
          </Link>
          .
        </p>
      </header>

      <DailyChallengeClient
        date={daily.date}
        question={daily.question}
        scenario={daily.scenario}
        attempt={daily.attempt}
        streak={daily.streak}
        stats={daily.stats}
        todayAnswered={daily.todayAnswered}
        suggestedQuiz={
          suggestedBank && !suggestedBank.isPremium
            ? {
                title: suggestedBank.title,
                href: "/quizzes",
              }
            : null
        }
      />

      <p className="mt-10 text-center text-xs text-slate-600">
        Signed in as {user.email}
      </p>
    </div>
  );
}
