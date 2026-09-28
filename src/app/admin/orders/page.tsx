import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { markRefundAction } from "@/app/actions/admin";
import { RowAction } from "@/components/admin/admin-forms";
import { formatDate, formatINR, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const [orders, totals, webhookFailures] = await Promise.all([
    prisma.order.findMany({
      where: status && status !== "ALL" ? { status: status as never } : {},
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        taxPaise: true,
        discount: true,
        status: true,
        gatewayOrderId: true,
        gatewayPaymentId: true,
        createdAt: true,
        refundedAt: true,
        user: { select: { email: true } },
        plan: { select: { name: true } },
        coupon: { select: { code: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true, taxPaise: true },
    }),
    prisma.webhookEvent.findMany({
      where: { error: { not: null } },
      orderBy: { processedAt: "desc" },
      take: 10,
      select: { id: true, eventType: true, error: true, processedAt: true },
    }),
  ]);

  const paidTotal =
    totals.find((t) => t.status === "PAID")?._sum.amount ?? 0;
  const paidTax = totals.find((t) => t.status === "PAID")?._sum.taxPaise ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Orders</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Payments and refunds. Marking a refund does not revoke access
          automatically; do that from the users page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metric
          label="Gross paid"
          value={formatINR(paidTotal + paidTax)}
        />
        {(["PAID", "FAILED", "REFUNDED", "CREATED"] as const).map((key) => {
          const row = totals.find((t) => t.status === key);
          return (
            <Metric key={key} label={key.toLowerCase()} value={String(row?._count._all ?? 0)} />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {["ALL", "PAID", "FAILED", "REFUNDED", "CREATED"].map((key) => (
          <a
            key={key}
            href={key === "ALL" ? "/admin/orders" : `/admin/orders?status=${key}`}
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
              (status ?? "ALL") === key
                ? "border-brand-400/50 bg-brand-400/10 text-brand-400"
                : "border-ink-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {key.toLowerCase()}
          </a>
        ))}
      </div>

      {webhookFailures.length > 0 ? (
        <section className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-5">
          <h2 className="font-semibold text-rose-200">
            Webhook events that failed
          </h2>
          <ul className="mt-3 space-y-1.5 font-mono text-xs text-rose-200/80">
            {webhookFailures.map((event) => (
              <li key={event.id}>
                {event.eventType}: {event.error} &middot;{" "}
                {relativeTime(event.processedAt)}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            These usually mean the webhook arrived before the order did, or the
            amount did not match. Grant access manually if needed.
          </p>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-ink-700">
        <div className="pp-scroll-x">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="bg-ink-900">
              <tr>
                {["Invoice", "User", "Plan", "Total", "Status", "Date", ""].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-slate-400"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800 bg-ink-950">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {order.invoiceNumber ?? order.id.slice(0, 12)}
                    {order.coupon ? (
                      <span className="ml-2 rounded border border-ink-600 px-1 py-0.5 text-[10px] uppercase text-slate-500">
                        {order.coupon.code}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {order.user.email}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {order.plan.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">
                    {formatINR(order.amount + order.taxPaise)}
                    {order.discount > 0 ? (
                      <span className="ml-1 text-emerald-400">
                        -{formatINR(order.discount)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.status === "PAID" ? (
                      <RowAction
                        label="Mark refunded"
                        action={markRefundAction}
                        fields={{ orderId: order.id }}
                        confirm="Mark this order as refunded?"
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-bold text-white">{value}</p>
    </div>
  );
}
