"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkCouponAction,
  startCheckoutAction,
  type CouponState,
  type CheckoutState,
} from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-field";
import { formatINR } from "@/lib/utils";

type PlanOption = {
  id: string;
  name: string;
  priceInr: number;
  durationDays: number;
  /** Pay-once plan: shown as "lifetime" rather than a day count. */
  lifetime: boolean;
};

/** Loads the Razorpay checkout script once, on demand. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const existing = window as unknown as { Razorpay?: unknown };
    if (existing.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutForm({
  plans,
  preselectPlan,
  initialCoupon,
  isSignedIn,
  emailVerified = true,
}: {
  plans: PlanOption[];
  preselectPlan?: string;
  initialCoupon?: string;
  isSignedIn: boolean;
  emailVerified?: boolean;
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState(
    () => preselectPlan ?? plans[0]?.id ?? "",
  );
  const [couponInput, setCouponInput] = useState(initialCoupon ?? "");
  const [coupon, setCoupon] = useState<CouponState | null>(
    initialCoupon ? null : null,
  );
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderIdRef = useRef<string | null>(null);

  const plan = plans.find((p) => p.id === planId);
  const pricePaise = (plan?.priceInr ?? 0) * 100;
  const discountPaise = coupon?.ok ? coupon.discountPaise : 0;
  const payablePaise = pricePaise - discountPaise;

  /*
   * A signed-in user with an unconfirmed address cannot be charged, so the
   * notice appears before the coupon box rather than after a failed payment
   * attempt. The server enforces this too; this is here so the requirement is
   * visible while the user still has the choice to act on it.
   */
  const needsVerification = isSignedIn && !emailVerified;

  // Auto-apply a coupon passed in via the URL (e.g. /pricing?coupon=LAUNCH50).
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initialCoupon || !planId) return;
    appliedInitial.current = true;
    void apply(initialCoupon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, initialCoupon]);

  async function apply(code: string) {
    if (!planId) return;
    setChecking(true);
    setError(null);
    const result = await checkCouponAction({ planId, code });
    setCoupon(result.ok ? result : null);
    if (!result.ok) setError(result.error);
    setChecking(false);
  }

  function clearCoupon() {
    setCoupon(null);
    setCouponInput("");
    setError(null);
  }

  async function pay() {
    if (!planId) return;

    if (!isSignedIn) {
      router.push(`/signup?next=${encodeURIComponent("/pricing")}`);
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const started = await startCheckoutAction({
        planId,
        couponCode: coupon?.ok ? coupon.code : null,
      });

      if (!started.ok) {
        setError(started.error);
        setPaying(false);
        return;
      }

      orderIdRef.current = started.orderId;

      // No gateway configured (local dev / before keys are set): route the user
      // to a clear message instead of failing silently.
      if (!started.razorpayKeyId || !started.gatewayOrderId) {
        setPaying(false);
        setError(
          "Checkout is not available right now. Please try again shortly, or contact support for help.",
        );
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        setPaying(false);
        setError("Could not load the payment window. Check your connection.");
        return;
      }

    const RazorpayCtor = (
      window as unknown as {
        Razorpay: new (options: Record<string, unknown>) => {
          open: () => void;
          on: (event: string, handler: (payload: unknown) => void) => void;
        };
      }
    ).Razorpay;

    const rz = new RazorpayCtor({
      key: started.razorpayKeyId,
      order_id: started.gatewayOrderId,
      amount: started.amountPaise,
      currency: "INR",
      name: "PipelinePrep",
      description: `${started.planName} Premium access`,
      prefill: { name: "", email: "" },
      notes: { orderId: started.orderId },
      theme: { color: "#38bdf8" },
      modal: {
        ondismiss: () => {
          setPaying(false);
          setError("Checkout closed. Your plan has not been charged.");
        },
      },
      handler: async (payload: unknown) => {
        const p = payload as {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        };

        // Confirm server-side, then send the user to their dashboard.
        const { verifyPaymentAction } = await import("@/app/actions/checkout");
        const result = await verifyPaymentAction({
          orderId: started.orderId,
          razorpayOrderId: p.razorpay_order_id,
          razorpayPaymentId: p.razorpay_payment_id,
          razorpaySignature: p.razorpay_signature,
        });

        setPaying(false);

        if (result.ok) {
          router.push(
            `/dashboard?upgraded=1${result.invoiceNumber ? `&invoice=${encodeURIComponent(result.invoiceNumber)}` : ""}`,
          );
          router.refresh();
        } else {
          setError(result.error);
        }
      },
    });

    rz.on("payment.failed", (payload: unknown) => {
      setPaying(false);
      const p = payload as { error?: { description?: string } };
      setError(
        p.error?.description ??
          "Payment failed. No money has been deducted; please try again.",
      );
    });

    rz.open();
  } catch (err) {
    setPaying(false);
    setError(
      err instanceof Error
        ? err.message
        : "Failed to open checkout. Please try again.",
    );
  }
}

  if (plans.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-400">
        No paid plans are available right now.
      </p>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-ink-700 bg-ink-900 p-6">
      {needsVerification ? (
        <p className="mb-5 rounded-lg border border-amber-450/30 bg-amber-450/10 px-3.5 py-3 text-sm leading-relaxed text-amber-100">
          Confirm your email address before paying. We do not take payment on an
          address we have not confirmed.{" "}
          <a
            href="/dashboard"
            className="font-medium underline underline-offset-4"
          >
            Resend the link
          </a>
          .
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label
            htmlFor="plan-select"
            className="block text-sm font-medium text-slate-300"
          >
            Plan
          </label>
          <select
            id="plan-select"
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              // A coupon may be plan-restricted, so re-validate on change.
              if (coupon?.ok) void apply(coupon.code);
            }}
            className="mt-1.5 w-full rounded-lg border border-ink-600 bg-ink-850 px-3.5 py-2.5 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} &middot; {formatINR(p.priceInr * 100)} &middot;{" "}
                {p.lifetime ? "lifetime" : `${p.durationDays} days`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="coupon-input"
            className="block text-sm font-medium text-slate-300"
          >
            Coupon
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="coupon-input"
              value={coupon?.ok ? coupon.code : couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="LAUNCH50"
              className="w-36 rounded-lg border border-ink-600 bg-ink-850 px-3.5 py-2.5 font-mono text-sm uppercase text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
            <Button
              variant="secondary"
              onClick={() => apply(couponInput)}
              disabled={checking || !couponInput.trim()}
            >
              {checking ? "Checking…" : coupon?.ok ? "Update" : "Apply"}
            </Button>
          </div>
        </div>
      </div>

      {coupon?.ok ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-mint-400/30 bg-mint-400/10 px-3.5 py-2.5">
          <p className="text-sm text-mint-200">
            <span className="font-mono font-semibold">{coupon.code}</span> applied
            &middot; {coupon.label}
          </p>
          <button
            type="button"
            onClick={clearCoupon}
            className="cursor-pointer text-xs text-mint-300 underline underline-offset-4"
          >
            Remove
          </button>
        </div>
      ) : null}

      {/* Order summary */}
      <dl className="mt-6 space-y-2 border-t border-ink-800 pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-400">Plan price</dt>
          <dd className="font-mono text-slate-200">
            {formatINR(pricePaise)}
          </dd>
        </div>
        {discountPaise > 0 ? (
          <div className="flex justify-between text-mint-300">
            <dt>Discount</dt>
            <dd className="font-mono">&minus;{formatINR(discountPaise)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-ink-800 pt-2 text-base">
          <dt className="font-medium text-white">Total (incl. GST)</dt>
          <dd className="font-mono font-bold text-white">
            {formatINR(payablePaise)}
          </dd>
        </div>
      </dl>

      {error ? (
        <div className="mt-4">
          <FormError message={error} />
        </div>
      ) : null}

      <Button
        className="mt-5 w-full"
        onClick={pay}
        disabled={paying || checking || needsVerification}
      >
        {paying
          ? "Opening payment…"
          : needsVerification
            ? "Confirm your email to pay"
            : isSignedIn
              ? `Pay ${formatINR(payablePaise)}`
              : "Sign in to pay"}
      </Button>

      <p className="mt-3 text-center text-xs text-slate-500">
        Secure payment via Razorpay. UPI, cards, netbanking and wallets. GST
        invoice emailed on success.
      </p>
    </div>
  );
}
