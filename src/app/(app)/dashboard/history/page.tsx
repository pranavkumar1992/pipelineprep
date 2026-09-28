import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatDuration, relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Attempt history",
  robots: { index: false, follow: false },
};

const PER_PAGE = 25;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser("/dashboard/history");
  const { page } = await searchParams;
  const current = Math.max(1, Number(page) || 1);

  const [attempts, total] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        quiz: {
          select: {
            title: true,
            slug: true,
            topic: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.quizAttempt.count({ where: { userId: user.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300">
          Dashboard
        </Link>
        <span aria-hidden="true" className="mx-2 text-slate-700">
          /
        </span>
        <span className="text-slate-400">History</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-white">
        Attempt history
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {total} attempt{total === 1 ? "" : "s"} recorded. Scores and timings are
        kept so you can see the improvement over time.
      </p>

      {attempts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-ink-600 py-16 text-center">
          <p className="text-sm text-slate-400">Nothing here yet.</p>
          <Link href="/quizzes" className="mt-3 inline-block text-sm text-brand-400">
            Take your first quiz
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {attempts.map((attempt) => {
            const pct = attempt.total
              ? Math.round((attempt.score / attempt.total) * 100)
              : 0;
            return (
              <li
                key={attempt.id}
                className="flex flex-col gap-2 rounded-lg border border-ink-700 bg-ink-900 p-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href="/quizzes"
                    className="text-sm font-medium text-white hover:text-brand-400"
                  >
                    {attempt.quiz.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                    {attempt.quiz.topic.name} &middot;{" "}
                    {formatDuration(attempt.duration)} &middot;{" "}
                    {relativeTime(attempt.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-800">
                    <div
                      className={`h-full rounded-full ${pct >= 80 ? "bg-mint-400" : pct >= 60 ? "bg-brand-400" : pct >= 40 ? "bg-amber-450" : "bg-rose-450"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono text-xs text-slate-300">
                    {attempt.score}/{attempt.total}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-8 flex items-center justify-between gap-4"
        >
          {current > 1 ? (
            <Link
              href={`/dashboard/history?page=${current - 1}`}
              className="rounded-lg border border-ink-600 bg-ink-800 px-4 py-2 text-sm text-slate-200 hover:bg-ink-700"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-xs text-slate-500">
            Page {current} of {totalPages}
          </span>
          {current < totalPages ? (
            <Link
              href={`/dashboard/history?page=${current + 1}`}
              className="rounded-lg border border-ink-600 bg-ink-800 px-4 py-2 text-sm text-slate-200 hover:bg-ink-700"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
