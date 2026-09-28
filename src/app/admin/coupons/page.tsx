import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  deleteCouponAction,
  saveCouponAction,
  toggleCouponAction,
} from "@/app/actions/admin";
import {
  AInput,
  ASelect,
  AdminEditor,
  RowAction,
} from "@/components/admin/admin-forms";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  const [coupons, plans] = await Promise.all([
    prisma.coupon.findMany({
      orderBy: [{ active: "desc" }, { code: "asc" }],
      include: { plans: { include: { plan: { select: { name: true } } } } },
    }),
    prisma.plan.findMany({
      where: { active: true, isFreeTier: false },
      orderBy: { position: "asc" },
      select: { id: true, name: true, priceInr: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Coupons</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Percentage or flat discount. A coupon with no plans attached applies to
          every paid plan. Usage counts up only when a payment succeeds, so an
          abandoned checkout does not consume a use.
        </p>
      </div>

      <AdminEditor title="Create coupon" action={saveCouponAction} defaultOpen>{
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <AInput label="Code" name="code" required placeholder="LAUNCH50" />
              <ASelect
                label="Type"
                name="type"
                defaultValue="PERCENT"
                options={[
                  { value: "PERCENT", label: "Percent" },
                  { value: "FLAT", label: "Flat (INR)" },
                ]}
              />
              <AInput
                label="Value"
                name="value"
                type="number"
                required
                placeholder="50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <AInput
                label="Max uses"
                name="maxUses"
                type="number"
                placeholder="Unlimited"
              />
              <AInput
                label="Per-user limit"
                name="perUserLimit"
                type="number"
                defaultValue={1}
              />
              <AInput
                label="Valid to"
                name="validTo"
                type="date"
                hint="Optional expiry."
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">
                Restrict to plans (leave all unchecked for every paid plan)
              </p>
              <div className="flex flex-col gap-2">
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      name="planIds"
                      value={plan.id}
                      className="h-4 w-4 rounded border-ink-600 bg-ink-850 text-brand-400 focus:ring-2 focus:ring-brand-400/30"
                    />
                    {plan.name} (&#8377;{plan.priceInr})
                  </label>
                ))}
              </div>
            </div>
          </div>
        }
      </AdminEditor>

      <div className="overflow-hidden rounded-xl border border-ink-700">
        <div className="pp-scroll-x">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="bg-ink-900">
              <tr>
                {["Code", "Discount", "Plans", "Uses", "Expires", "Status", ""].map(
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
              {coupons.map((coupon) => {
                const exhausted =
                  coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
                const expired =
                  coupon.validTo !== null && coupon.validTo < new Date();

                return (
                  <tr key={coupon.id}>
                    <td className="px-4 py-3 font-mono text-sm text-white">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {coupon.type === "PERCENT"
                        ? `${coupon.value}% off`
                        : `\u20b9${coupon.value} off`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {coupon.plans.length === 0
                        ? "All paid plans"
                        : coupon.plans.map((p) => p.plan.name).join(", ")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {coupon.usedCount}
                      {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {coupon.validTo ? formatDate(coupon.validTo) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                          !coupon.active
                            ? "border-ink-600 bg-ink-850 text-slate-500"
                            : expired
                              ? "border-amber-450/30 bg-amber-450/10 text-amber-300"
                              : exhausted
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                                : "border-mint-400/30 bg-mint-400/10 text-mint-300"
                        }`}
                      >
                        {!coupon.active
                          ? "off"
                          : expired
                            ? "expired"
                            : exhausted
                              ? "used up"
                              : "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <RowAction
                          label={coupon.active ? "Disable" : "Enable"}
                          action={toggleCouponAction}
                          fields={{ id: coupon.id }}
                          variant="secondary"
                        />
                        <RowAction
                          label="Delete"
                          action={deleteCouponAction}
                          fields={{ id: coupon.id }}
                          confirm={`Delete coupon ${coupon.code}?`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
