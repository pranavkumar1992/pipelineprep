import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Flame,
  Layers,
  ListChecks,
  Sparkles,
  Target,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getEmailVerificationState } from "@/lib/auth/entitlement";
import { getDashboardData } from "@/lib/dashboard";
import { formatDate, pluralize, relativeTime } from "@/lib/utils";
import { CareerToolsCard } from "@/components/career-tools/career-tools-card";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; upgraded?: string; invoice?: string }>;
}) {
  const user = await requireUser("/dashboard");
  const { upgraded, invoice } = await searchParams;
  const [data, emailState] = await Promise.all([
    getDashboardData(),
    getEmailVerificationState(),
  ]);

  const isBrandNew = data.attempts === 0 && data.questionsAnswered === 0;
  const goalPct = Math.min(100, Math.round((data.todayAnswered / data.goal) * 100));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <VerifyEmailBanner
        email={emailState.email}
        verified={emailState.verified}
        verifiedVia={emailState.verifiedVia}
      />

      {upgraded ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-mint-400/30 bg-mint-400/10 px-4 py-3 text-sm text-mint-200"
        >
          Payment received. Premium is active.
          {invoice ? (
            <>
              {" "}
              Invoice <span className="font-mono">{invoice}</span> has been
              emailed to you.
            </>
          ) : null}
        </div>
      ) : null}

      {/* 1. Welcome banner */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome back, {data.name}
        </h1>
        <p className="mt-2 text-slate-400">
          Here&apos;s your learning snapshot.
        </p>
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* 2. Daily Challenge */}
        <section
          aria-labelledby="dash-challenge"
          className="rounded-2xl border border-ink-700 bg-ink-900 p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              id="dash-challenge"
              className="font-mono text-xs uppercase tracking-wider text-slate-500"
            >
              Daily Challenge
            </h2>
            {data.challenge.done ? (
              <span className="inline-flex items-center gap-1 rounded border border-mint-400/30 bg-mint-400/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mint-300">
                Done
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded border border-brand-400/30 bg-brand-400/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-brand-400">
                <Sparkles size={9} aria-hidden="true" />
                New
              </span>
            )}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {data.challenge.done
              ? data.challenge.correct
                ? "You got today&apos;s question right. Streak is safe."
                : "Today&apos;s question is done. The streak still counts."
              : "One question a day keeps the streak alive."}
          </p>

          <Link
            href="/daily"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:underline"
          >
            {data.challenge.done ? "Review today&apos;s challenge" : "Take today's challenge"}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>

        {/* 3. Today's practice */}
        <section
          aria-labelledby="dash-today"
          className="rounded-2xl border border-ink-700 bg-ink-900 p-6"
        >
          <h2
            id="dash-today"
            className="font-mono text-xs uppercase tracking-wider text-slate-500"
          >
            Today&apos;s practice
          </h2>

          <p className="mt-3 text-2xl font-bold text-white">
            You practiced {data.todayAnswered} question
            {data.todayAnswered === 1 ? "" : "s"} today
          </p>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-ink-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={data.goal}
            aria-valuenow={Math.min(data.todayAnswered, data.goal)}
            aria-label="Daily goal progress"
          >
            <div
              className="h-full rounded-full bg-brand-400 transition-all"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-xs text-slate-500">
            {data.todayRemaining > 0
              ? `${data.todayRemaining} more to hit today's goal and protect your streak`
              : "Daily goal reached. Streak secured."}
          </p>

          <Link
            href="/quizzes"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand-400 px-4 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
          >
            Practice now
          </Link>
        </section>

        {/* 4. Streak */}
        <section
          aria-labelledby="dash-streak"
          className="rounded-2xl border border-ink-700 bg-ink-900 p-6"
        >
          <h2
            id="dash-streak"
            className="font-mono text-xs uppercase tracking-wider text-slate-500"
          >
            Streak
          </h2>
          <p className="mt-3 flex items-baseline gap-2">
            <Flame size={20} className="text-amber-400" aria-hidden="true" />
            <span className="font-mono text-3xl font-bold text-white">
              {data.streak.current}
            </span>
            <span className="text-sm text-slate-400">
              {data.streak.current === 1 ? "day" : "days"}
            </span>
          </p>
          <dl className="mt-4 space-y-1.5 font-mono text-xs text-slate-500">
            <div className="flex justify-between">
              <dt>Longest</dt>
              <dd className="text-slate-300">{data.streak.longest} days</dd>
            </div>
            <div className="flex justify-between">
              <dt>Active days</dt>
              <dd className="text-slate-300">{data.streak.activeDays}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* 5. Recommended for you */}
      <section aria-labelledby="dash-rec" className="mt-10">
        <h2
          id="dash-rec"
          className="font-mono text-xs uppercase tracking-wider text-slate-500"
        >
          Recommended for you
        </h2>

        {data.recommendations.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-ink-600 bg-ink-900 p-8 text-center">
            <Target
              size={22}
              className="mx-auto text-slate-600"
              aria-hidden="true"
            />
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
              Attempt a few quizzes and we&apos;ll suggest tailored practice
              based on your weak areas.
            </p>
            <Link
              href="/quizzes"
              className="mt-5 inline-flex h-10 items-center rounded-lg border border-ink-600 bg-ink-800 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-ink-700"
            >
              Browse quizzes
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {data.recommendations.map((rec) => (
              <li
                key={rec.title}
                className="rounded-xl border border-ink-700 bg-ink-900 p-5"
              >
                <p className="font-mono text-[11px] uppercase tracking-wide text-brand-400">
                  {rec.reason}
                </p>
                <p className="mt-2 font-semibold text-white">{rec.title}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {rec.accuracyPct}% accuracy
                </p>
                <Link
                  href="/quizzes"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-400 hover:underline"
                >
                  Practise
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 6. Plan */}
      <section aria-labelledby="dash-plan" className="mt-10">
        <h2
          id="dash-plan"
          className="font-mono text-xs uppercase tracking-wider text-slate-500"
        >
          Plan
        </h2>
        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 ${
            data.plan.isPremium
              ? "border-brand-400/30 bg-brand-400/5"
              : "border-ink-700 bg-ink-900"
          }`}
        >
          <div>
            <p className="font-semibold text-white">
              {data.plan.isPremium
                ? `${data.plan.name ?? "Premium"} (active)`
                : "Free plan (active)"}
            </p>
            <p className="mt-1.5 text-sm text-slate-400">
              {data.plan.isPremium
                ? `Access until ${data.plan.expiresAt ? formatDate(data.plan.expiresAt) : "renewal"}.`
                : "Free access to selected quizzes & scenarios"}
            </p>
          </div>
          {data.plan.isPremium ? (
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center rounded-lg border border-ink-600 bg-ink-800 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-ink-700"
            >
              Renew
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center rounded-lg bg-brand-400 px-4 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
            >
              Upgrade to Premium
            </Link>
          )}
        </div>
      </section>

      {/* 7. Stat tiles */}
      <section aria-labelledby="dash-stats" className="mt-10">
        <h2
          id="dash-stats"
          className="font-mono text-xs uppercase tracking-wider text-slate-500"
        >
          At a glance
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatTile
            icon={<ListChecks size={15} aria-hidden="true" />}
            label="Quizzes attempted"
            value={String(data.attempts)}
          />
          <StatTile
            icon={<BarChart3 size={15} aria-hidden="true" />}
            label="Average score"
            value={data.averageScore === null ? "—" : `${data.averageScore}%`}
            percentage={data.averageScore ?? 0}
          />
          <StatTile
            icon={<Calendar size={15} aria-hidden="true" />}
            label="Last activity"
            value={
              data.lastActivity
                ? relativeTime(data.lastActivity.when)
                : "No activity yet"
            }
            hint={data.lastActivity?.title}
          />
        </div>
      </section>

      {/* 8. Shortcuts */}
      <section aria-labelledby="dash-shortcuts" className="mt-10">
        <h2
          id="dash-shortcuts"
          className="font-mono text-xs uppercase tracking-wider text-slate-500"
        >
          Shortcuts
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ShortcutCard
            href="/dashboard/performance"
            icon={<BarChart3 size={18} aria-hidden="true" />}
            title="Performance"
            body={
              isBrandNew
                ? "Accuracy, weak areas and score trends will appear here."
                : `${data.averageScore ?? 0}% accuracy across ${pluralize(data.questionsAnswered, "question")}.`
            }
          />
          <ShortcutCard
            href="/quizzes"
            icon={<ListChecks size={18} aria-hidden="true" />}
            title="Browse quizzes"
            body="Ten topics, three levels each. Beginner is free."
          />
          <ShortcutCard
            href="/scenarios"
            icon={<Layers size={18} aria-hidden="true" />}
            title="Practice scenarios"
            body="Step-by-step incident walkthroughs with real commands."
          />
        </div>
      </section>

      {/* 9. Recent activity */}
      <section aria-labelledby="dash-recent" className="mt-10">
        <h2
          id="dash-recent"
          className="font-mono text-xs uppercase tracking-wider text-slate-500"
        >
          Recent activity
        </h2>

        {data.recent.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink-600 bg-ink-900 px-5 py-8 text-center text-sm text-slate-400">
            No attempts yet, try your first quiz!
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.recent.map((item) => {
              const pct =
                item.total > 0 ? Math.round((item.score / item.total) * 100) : 0;
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {item.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {item.topicName} &middot; {relativeTime(item.when)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm text-slate-300">
                    {item.score}/{item.total}
                    <span className="ml-2 text-xs text-slate-500">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Career Tools teaser (addendum) */}
      <div className="mt-10">
        <CareerToolsCard source="DASHBOARD" isSignedIn={Boolean(user)} />
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  percentage,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  percentage?: number;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-5">
      <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">
        <span aria-hidden="true" className="text-brand-400">
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold text-white">{value}</p>
      {percentage !== undefined ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-brand-400"
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : null}
      {hint ? <p className="mt-2 truncate text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ShortcutCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-ink-700 bg-ink-900 p-5 transition-colors hover:border-brand-400/40"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-400/25 bg-brand-400/10 text-brand-400"
      >
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-white group-hover:text-brand-400">
        {title}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
    </Link>
  );
}
