import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import {
  DeleteAccountForm,
  LinkedAccountsSection,
  PasswordSettingsForm,
  ProfileSettingsForm,
} from "@/components/dashboard/settings-forms";

export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");

  /*
   * Security state, read once for the two controls below: whether a password
   * exists, and whether Google is linked. The unlink button is disabled without
   * a password, and the form omits the current-password field when there is
   * none, so both need the same two facts.
   */
  const [account, links] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    }),
    prisma.oAuthAccount.findMany({
      where: { userId: user.id },
      select: { provider: true },
    }),
  ]);

  const hasPassword = (account?.passwordHash ?? null) !== null;
  const googleLinked = links.some((link) => link.provider === "google");

  const orders = await prisma.order.findMany({
    where: { userId: user.id, status: "PAID" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      amount: true,
      taxPaise: true,
      createdAt: true,
      plan: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300">
          Dashboard
        </Link>
        <span aria-hidden="true" className="mx-2 text-slate-700">
          /
        </span>
        <span className="text-slate-400">Settings</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-white">
        Account settings
      </h1>

      <section className="mt-8 rounded-xl border border-ink-700 bg-ink-900 p-6">
        <h2 className="font-semibold text-white">Profile</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Used to tailor your dashboard. Never shared with third parties.
        </p>
        <div className="mt-6">
          <ProfileSettingsForm user={user} />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-ink-700 bg-ink-900 p-6">
        <h2 className="font-semibold text-white">Sign-in</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          How you access this account.
        </p>

        <div className="mt-6 space-y-8">
          <div>
            <h3 className="text-sm font-medium text-slate-300">Password</h3>
            <div className="mt-4">
              <PasswordSettingsForm hasPassword={hasPassword} />
            </div>
          </div>

          <div className="border-t border-ink-800 pt-6">
            <h3 className="text-sm font-medium text-slate-300">
              Linked accounts
            </h3>
            <div className="mt-4">
              <LinkedAccountsSection
                googleLinked={googleLinked}
                hasPassword={hasPassword}
                googleEnabled={env.googleEnabled}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-ink-700 bg-ink-900 p-6">
        <h2 className="font-semibold text-white">Purchase history</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Invoices are also emailed to you on each payment.
        </p>

        {orders.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No purchases yet.{" "}
            <Link href="/pricing" className="text-brand-400 hover:underline">
              See Premium plans
            </Link>
            .
          </p>
        ) : (
          <div className="pp-scroll-x mt-5">
            <table className="w-full min-w-[520px] border-collapse text-sm">
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
                    <td className="px-3 py-3 text-right font-mono text-slate-200">
                      {((order.amount + order.taxPaise) / 100).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/5 p-6">
        <h2 className="font-semibold text-white">Delete account</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
          This permanently removes your account, attempt history, saved progress
          and bookmarks. It cannot be undone. Billing records are retained as
          required by tax law, but are no longer linked to you in the product.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          If your goal is simply to stop using Premium, you can just let your
          plan lapse. There is no auto-renewal, so nothing will be charged and
          you keep your history.
        </p>
        <div className="mt-6">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
