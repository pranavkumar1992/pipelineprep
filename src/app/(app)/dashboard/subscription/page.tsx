import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Subscription",
  robots: { index: false, follow: false },
};

/** Subscription and billing history (target of the header's Subscription menu item). */
export default async function SubscriptionPage() {
  const user = await requireUser("/dashboard/subscription");

  const [subscription, orders] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { expiresAt: "desc" },
      include: { plan: { select: { name: true, durationDays: true } } },
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        taxPaise: true,
        status: true,
        createdAt: true,
        plan: { select: { name: true } },
      },
    }),
  ]);

  const active =
    subscription && subscription.expiresAt.getTime() > Date.now() ? subscription : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300">
          Dashboard
        </Link>
        <span aria-hidden="true" className="mx-2 text-slate-700">
          /
        </span>
        <span className="text-slate-400">Subscription</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-white">
        Subscription
      </h1>

      <section className="mt-8">
        <div
          className={`rounded-2xl border p-6 ${
            active
              ? "border-brand-400/30 bg-brand-400/5"
              : "border-ink-700 bg-ink-900"
          }`}
        >
          {active ? (
            <>
              <p className="font-mono text-xs uppercase tracking-wider text-slate-500">
                Current plan
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {active.plan.name}
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                Active until {formatDate(active.expiresAt)}. There is no
                auto-renewal, so access simply ends then.
              </p>
              <Link
                href="/pricing"
                className="mt-5 inline-flex h-10 items-center rounded-lg border border-ink-600 bg-ink-800 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-ink-700"
              >
                Extend or change plan
              </Link>
            </>
          ) : (
            <>
              <p className="font-mono text-xs uppercase tracking-wider text-slate-500">
                Free plan
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                You are on the free tier
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                Free quizzes in every topic, a set of full incident scenarios,
                and all of the progress tracking.
              </p>
              <Link
                href="/pricing"
                className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand-400 px-4 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
              >
                Upgrade to Premium
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-wider text-slate-500">
          Billing history
        </h2>

        {orders.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink-600 px-5 py-8 text-center text-sm text-slate-400">
            No payments yet.
          </p>
        ) : (
          <div className="pp-scroll-x mt-4">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-700">
                  <th scope="col" className="px-3 py-2.5 text-left font-medium text-slate-400">
                    Invoice
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium text-slate-400">
                    Plan
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium text-slate-400">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium text-slate-400">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium text-slate-400">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-3 py-3 font-mono text-xs text-slate-300">
                      {order.invoiceNumber ?? order.id.slice(0, 10)}
                    </td>
                    <td className="px-3 py-3 text-slate-300">{order.plan.name}</td>
                    <td className="px-3 py-3 text-slate-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                          order.status === "PAID"
                            ? "border-mint-400/30 bg-mint-400/10 text-mint-300"
                            : order.status === "REFUNDED"
                              ? "border-amber-450/30 bg-amber-450/10 text-amber-300"
                              : "border-ink-600 bg-ink-850 text-slate-400"
                        }`}
                      >
                        {order.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-200">
                      {formatINR(order.amount + order.taxPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
