import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Top scores across PipelinePrep.",
  robots: { index: false, follow: false },
};

/**
 * Leaderboard (G-1). Opt-in only: entries exist solely for users who enabled the
 * leaderboard in settings, and the display name is shown rather than the
 * account email.
 */
export default async function LeaderboardPage() {
  await requireUser("/leaderboard");

  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      period: "ALLTIME",
      user: { showOnLeaderboard: true },
      quizzesCompleted: { gt: 0 },
    },
    orderBy: { totalScore: "desc" },
    take: 50,
    select: {
      id: true,
      totalScore: true,
      quizzesCompleted: true,
      accuracyBps: true,
      user: { select: { displayName: true, name: true } },
    },
  });

  const rows = entries.map((entry) => ({
    id: entry.id,
    name: entry.user.displayName ?? entry.user.name ?? "Anonymous",
    score: entry.totalScore,
    quizzes: entry.quizzesCompleted,
    accuracy: Math.round(entry.accuracyBps / 100),
  }));

  const me = await prisma.leaderboardEntry.findFirst({
    where: { user: { showOnLeaderboard: true }, period: "ALLTIME" },
    orderBy: { totalScore: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <header className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-450/30 bg-amber-450/10 text-amber-400"
        >
          <Trophy size={20} />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Leaderboard
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Opt-in. Only people who turned this on in settings appear here, and
            we show a display name rather than an email address.
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-ink-600 py-16 text-center">
          <p className="text-sm text-slate-400">
            No entries yet. Enable the leaderboard in your settings and complete
            a quiz to appear here.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-4 inline-block text-sm text-brand-400 hover:underline"
          >
            Open settings
          </Link>
        </div>
      ) : (
        <ol className="mt-8 space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className={`flex items-center gap-4 rounded-xl border p-4 ${
                row.id === me?.id
                  ? "border-brand-400/40 bg-brand-400/5"
                  : "border-ink-700 bg-ink-900"
              }`}
            >
              <span className="w-8 shrink-0 font-mono text-sm text-slate-500">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-white">
                {row.name}
              </span>
              <span className="shrink-0 font-mono text-xs text-slate-500">
                {row.quizzes} quizzes &middot; {row.accuracy}%
              </span>
              <span className="w-20 shrink-0 text-right font-mono text-sm text-brand-400">
                {row.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
