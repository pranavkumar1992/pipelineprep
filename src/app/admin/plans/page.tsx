import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { savePlanAction } from "@/app/actions/admin";
import {
  ACheckbox,
  AInput,
  ATextarea,
  AdminEditor,
} from "@/components/admin/admin-forms";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Plans" };

/**
 * Plan and price management.
 *
 * Prices, durations and the pricing-card bullet points are all editable here so
 * changing what something costs is a UI operation, not a code change.
 */
export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      durationDays: true,
      priceInr: true,
      active: true,
      lifetime: true,
      position: true,
      isFreeTier: true,
      features: true,
      _count: { select: { orders: true, subscriptions: true } },
    },
  });

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Plans</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Prices and feature lists shown on the pricing page. Changing a price
          takes effect immediately for new purchases; existing subscriptions keep
          the plan they bought.
        </p>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <AdminEditor
            key={plan.id}
            title={`${plan.name} — ${formatINR(plan.priceInr * 100)}`}
            action={savePlanAction}
          >
            <input type="hidden" name="id" value={plan.id} />

            <div className="space-y-4">
              {plan.isFreeTier ? (
                <p className="rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-sm text-slate-400">
                  The free tier is not purchasable, so its price is not shown or
                  charged. The list below still controls what the pricing page
                  advertises.
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <AInput
                  label="Price (INR)"
                  name="priceInr"
                  type="number"
                  defaultValue={plan.priceInr}
                  required
                />
                <AInput
                  label="Duration (days)"
                  name="durationDays"
                  type="number"
                  defaultValue={plan.durationDays}
                  hint="Ignored when lifetime."
                />
                <AInput
                  label="Sort position"
                  name="position"
                  type="number"
                  defaultValue={plan.position}
                  hint="Lower shows first."
                />
              </div>

              <ATextarea
                label="Tagline"
                name="description"
                rows={2}
                defaultValue={plan.description ?? undefined}
                hint="One line under the plan name."
              />

              <ATextarea
                label="Feature list"
                name="features"
                rows={7}
                defaultValue={plan.features.join("\n")}
                hint="One bullet per line. Shown in order on the pricing card."
              />

              <div className="flex flex-col gap-3">
                <ACheckbox
                  label="Lifetime access"
                  name="lifetime"
                  defaultChecked={plan.lifetime}
                  hint="Pay once, never expires."
                />
                <ACheckbox
                  label="Available for purchase"
                  name="active"
                  defaultChecked={plan.active}
                  hint="Uncheck to hide it from the pricing page."
                />
              </div>

              <p className="font-mono text-[11px] text-slate-600">
                {plan._count.orders} order(s) &middot;{" "}
                {plan._count.subscriptions} subscription(s) sold
              </p>
            </div>
          </AdminEditor>
        ))}
      </div>

      <p className="text-xs text-slate-600">
        Need to change something else?{" "}
        <Link href="/admin" className="text-brand-400 hover:underline">
          Back to overview
        </Link>
        .
      </p>
    </div>
  );
}
