import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    users,
    newUsers7,
    questions,
    scenarios,
    openReports,
    orders,
    revenue30,
    revenueAll,
    recentOrders,
    topQuizzes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.question.count({ where: { status: "PUBLISHED" } }),
    prisma.scenario.count({ where: { status: "PUBLISHED" } }),
    prisma.questionReport.count({ where: { status: "OPEN" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: since30 } },
      _sum: { amount: true, taxPaise: true },
    }),
    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true, taxPaise: true },
    }),
    prisma.order.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        taxPaise: true,
        createdAt: true,
        user: { select: { email: true } },
        plan: { select: { name: true } },
      },
    }),
    prisma.quizAttempt.groupBy({
      by: ["quizId"],
      _count: { _all: true },
      orderBy: { _count: { quizId: "desc" } },
      take: 5,
    }),
  ]);

  const quizTitles = await prisma.quiz.findMany({
    where: { id: { in: topQuizzes.map((t) => t.quizId) } },
    select: { id: true, title: true },
  });

  const gross30 = (revenue30._sum.amount ?? 0) + (revenue30._sum.taxPaise ?? 0);
  const grossAll = (revenueAll._sum.amount ?? 0) + (revenueAll._sum.taxPaise ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Platform health at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Users" value={String(users)} hint={`${newUsers7} in last 7 days`} />
        <Metric label="Paid orders" value={String(orders)} />
        <Metric
          label="Revenue (30d)"
          value={formatINR(gross30)}
          hint={`${formatINR(grossAll)} all time`}
        />
        <Metric
          label="Open reports"
          value={String(openReports)}
          hint={openReports > 0 ? "Needs review" : "None"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Published questions" value={String(questions)} />
        <Metric label="Published scenarios" value={String(scenarios)} />
        <Metric
          label="Open messages"
          value={undefined}
          hint={<Link href="/admin/messages" className="text-brand-400">Inbox</Link>}
        />
        <Metric
          label="Plans & prices"
          value={undefined}
          hint={<Link href="/admin/plans" className="text-brand-400">Edit</Link>}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
          <h2 className="font-semibold text-white">Recent payments</h2>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No payments yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 font-mono text-xs"
                >
                  <span className="truncate text-slate-400">{order.user.email}</span>
                  <span className="shrink-0 text-slate-500">
                    {order.plan.name} &middot; {formatINR(order.amount + order.taxPaise)}{" "}
                    &middot; {relativeTime(order.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
          <h2 className="font-semibold text-white">Most attempted banks</h2>
          {topQuizzes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No attempts recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {topQuizzes.map((entry) => (
                <li
                  key={entry.quizId}
                  className="flex items-center justify-between gap-3 font-mono text-xs"
                >
                  <span className="truncate text-slate-400">
                    {quizTitles.find((q) => q.id === entry.quizId)?.title ?? entry.quizId}
                  </span>
                  <span className="shrink-0 text-slate-300">{entry._count._all}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-xs text-slate-600">
        Career Tools waitlist numbers live on the{" "}
        <Link href="/admin/career-tools" className="text-brand-400 hover:underline">
          waitlist page
        </Link>
        .
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {value ? (
        <p className="mt-2 font-mono text-2xl font-bold text-white">{value}</p>
      ) : null}
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
