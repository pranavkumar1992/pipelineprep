import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  grantPremiumAction,
  revokePremiumAction,
} from "@/app/actions/admin";
import { AdminEditor, RowAction } from "@/components/admin/admin-forms";
import { formatDate, formatINR, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [users, plans] = await Promise.all([
    prisma.user.findMany({
      where: q ? { email: { contains: q, mode: "insensitive" } } : {},
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        subscriptions: {
          where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "desc" },
          take: 1,
          select: { expiresAt: true, plan: { select: { name: true } } },
        },
        _count: {
          select: { orders: true, attempts: true, dailyAttempts: true },
        },
      },
    }),
    prisma.plan.findMany({
      where: { active: true, isFreeTier: false },
      orderBy: { position: "asc" },
      select: { id: true, name: true, durationDays: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Users</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Search by email and grant or revoke Premium manually (P-8).
        </p>
      </div>

      <form action="/admin/users" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by email…"
          aria-label="Search users"
          className="flex-1 rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-ink-800 px-4 py-2 text-sm text-slate-200 hover:bg-ink-700"
        >
          Search
        </button>
      </form>

      <ul className="space-y-3">
        {users.map((user) => {
          const subscription = user.subscriptions[0];
          return (
            <li
              key={user.id}
              className="rounded-xl border border-ink-700 bg-ink-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {user.name ?? "(no name)"}
                  </p>
                  <p className="font-mono text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                    {user.role.toLowerCase()} &middot;{" "}
                    {user.emailVerified ? "verified" : "unverified"} &middot; joined{" "}
                    {formatDate(user.createdAt)} ({relativeTime(user.createdAt)})
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-600">
                    {user._count.orders} orders &middot;{" "}
                    {user._count.attempts} attempts &middot;{" "}
                    {user._count.dailyAttempts} daily challenges
                  </p>
                </div>

                <div className="text-right">
                  {subscription ? (
                    <>
                      <p className="rounded border border-brand-400/30 bg-brand-400/10 px-2 py-1 font-mono text-[11px] text-brand-400">
                        {subscription.plan.name}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        until {formatDate(subscription.expiresAt)}
                      </p>
                    </>
                  ) : (
                    <p className="font-mono text-[11px] text-slate-500">Free tier</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                {subscription ? (
                  <RowAction
                    label="Revoke premium"
                    action={revokePremiumAction}
                    fields={{ userId: user.id }}
                    confirm={`Revoke Premium for ${user.email}?`}
                    variant="danger"
                  />
                ) : null}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                  Grant Premium manually
                </summary>
                <div className="mt-3">
                  <AdminEditor
                    title={`Grant access to ${user.email}`}
                    action={grantPremiumAction}
                  >{
                      <div className="space-y-3">
                        <input type="hidden" name="userId" value={user.id} />
                        <div className="flex flex-wrap gap-2">
                          {plans.map((plan) => (
                            <button
                              key={plan.id}
                              type="submit"
                              name="planId"
                              value={plan.id}
                              className="cursor-pointer rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs text-slate-200 hover:border-brand-400/40"
                            >
                              + {plan.name} ({plan.durationDays}d)
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          Clicking a plan extends access from the current expiry,
                          so no time is lost.
                        </p>
                      </div>
                    }
                  </AdminEditor>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      {users.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-600 px-5 py-10 text-center text-sm text-slate-400">
          No users match that search.
        </p>
      ) : null}

      <p className="text-xs text-slate-600">
        Need an order list?{" "}
        <Link href="/admin/orders" className="text-brand-400 hover:underline">
          Open orders
        </Link>
        .
      </p>
    </div>
  );
}
