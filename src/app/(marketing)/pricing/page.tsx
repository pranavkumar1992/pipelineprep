import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { env } from "@/lib/env";
import { getContentStats } from "@/lib/content";
import { CheckoutForm } from "@/components/pricing/checkout-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmailVerificationState } from "@/lib/auth/entitlement";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "PipelinePrep pricing: free tier plus Premium plans from INR 199. Unlimited quiz and scenario access, instant feedback with detailed explanations. No auto-renewal.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "PipelinePrep pricing",
    description:
      "Free tier plus Premium from INR 199. Every quiz and scenario, instant feedback, no auto-renewal.",
  },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; coupon?: string }>;
}) {
  const { plan: preselect, coupon } = await searchParams;

  const [plans, stats, user] = await Promise.all([
    prisma.plan.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        durationDays: true,
        priceInr: true,
        isFreeTier: true,
        lifetime: true,
        features: true,
      },
    }),
    getContentStats(),
    getCurrentUser(),
  ]);

  /*
   * Read alongside the user so the checkout form can say up front that a
   * confirmed address is required, rather than letting the user fill in the
   * form and then failing at the point of payment.
   */
  const emailState = await getEmailVerificationState();

  // `SubscriptionPlan` structured data helps price comparison in search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "PipelinePrep Premium",
    description:
      "Unlimited access to DevOps practice quizzes, incident scenarios and interview prep.",
    brand: { "@type": "Brand", name: "PipelinePrep" },
    offers: plans
      .filter((p) => !p.isFreeTier)
      .map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: p.priceInr,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `${env.siteUrl()}/pricing`,
      })),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.6",
      reviewCount: "128",
      bestRating: "5",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Simple pricing
        </h1>
        <p className="mt-4 text-slate-400">
          Start free and stay free if it suits you. Premium unlocks every quiz
          and scenario, including everything added while you are subscribed. All
          prices include GST.
        </p>
        <p className="mt-3 font-mono text-xs text-slate-500">
          No auto-renewal. Cancel any time by simply not renewing.
        </p>
      </header>

      {/* Plans */}
      <section aria-label="Plans" className="mt-14">
        <div className="grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => {
            // A lifetime plan has no per-month equivalent, so it is excluded.
            const perMonth =
              plan.durationDays > 0 && !plan.lifetime
                ? Math.round(plan.priceInr / (plan.durationDays / 30))
                : 0;

            // One card is highlighted as most popular and one as best value.
            // Named rather than index-based so reordering plans in the admin
            // panel does not silently move the badges.
            const isPopular = plan.name === "6 Months";
            const isBestValue = plan.name === "Yearly";
            const featured = isPopular || isBestValue;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  featured
                    ? "border-brand-400/50 bg-gradient-to-b from-brand-400/10 to-ink-900"
                    : "border-ink-700 bg-ink-900"
                }`}
              >
                {isPopular ? (
                  <span className="absolute -top-3 left-6 rounded-full border border-brand-400/50 bg-ink-950 px-3 py-1 font-mono text-[11px] text-brand-400">
                    Most popular
                  </span>
                ) : isBestValue ? (
                  <span className="absolute -top-3 left-6 rounded-full border border-mint-400/50 bg-ink-950 px-3 py-1 font-mono text-[11px] text-mint-400">
                    Best value
                  </span>
                ) : null}

                <h2 className="font-semibold text-white">{plan.name}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {plan.description}
                </p>

                <div className="mt-6">
                  {plan.isFreeTier ? (
                    <p className="font-mono text-4xl font-bold text-white">
                      Free
                    </p>
                  ) : (
                    <>
                      <p className="font-mono text-4xl font-bold text-white">
                        {formatINR(plan.priceInr * 100)}
                      </p>
                      <p className="mt-1.5 font-mono text-xs text-slate-500">
                        {plan.lifetime
                          ? "one-time payment"
                          : perMonth > 0
                            ? `${formatINR(perMonth * 100)}/month equivalent`
                            : `${plan.durationDays} days of access`}
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-6 flex-1">
                  <ul className="space-y-2.5">
                    {(plan.features.length > 0
                      ? plan.features
                      : plan.isFreeTier
                        ? FREE_FEATURES
                        : PREMIUM_FEATURES
                    ).map((feature) => (
                      <Feature key={feature} text={feature} />
                    ))}
                  </ul>
                </div>

                <div className="mt-7">
                  {plan.isFreeTier ? (
                    <Link
                      href={user ? "/quizzes" : "/signup"}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-sm font-medium text-slate-200 transition-colors hover:bg-ink-700"
                    >
                      {user ? "Start practising" : "Create free account"}
                    </Link>
                  ) : (
                    <Link
                      href={`/pricing?plan=${plan.id}&checkout=1#checkout`}
                      className={`flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                        featured
                          ? "bg-brand-400 text-ink-950 hover:bg-brand-500"
                          : "border border-ink-600 bg-ink-800 text-slate-200 hover:bg-ink-700"
                      }`}
                    >
                      Choose {plan.name}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-slate-500">
        Payments via UPI, cards, netbanking and wallets through Razorpay.{" "}
        {stats.questions} questions and {stats.scenarios} scenarios currently
        available.
      </p>

      {/* Feature comparison */}
      <section aria-labelledby="compare-heading" className="mt-20">
        <h2 id="compare-heading" className="text-2xl font-bold text-white">
          What each tier includes
        </h2>
        <div className="pp-scroll-x mt-6 rounded-xl border border-ink-700">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-900">
                <th scope="col" className="px-5 py-3.5 text-left font-medium text-slate-300">
                  Feature
                </th>
                <th scope="col" className="px-5 py-3.5 text-center font-medium text-slate-300">
                  Free
                </th>
                <th scope="col" className="px-5 py-3.5 text-center font-medium text-brand-400">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="bg-ink-950/40">
                  <th
                    scope="row"
                    className="px-5 py-3.5 text-left font-normal text-slate-300"
                  >
                    {row.feature}
                  </th>
                  <td className="px-5 py-3.5 text-center">
                    {row.free ? (
                      <span className="text-mint-400" aria-label="Included">
                        &#10003;
                      </span>
                    ) : (
                      <span className="text-slate-500" aria-label="Not included">
                        &mdash;
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-mint-400" aria-label="Included">
                      &#10003;
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Coupon note + checkout */}
      <section
        id="coupons"
        aria-labelledby="coupon-heading"
        className="mt-14 scroll-mt-24 rounded-2xl border border-brand-400/25 bg-brand-400/5 p-6 sm:p-8"
      >
        <h2
          id="coupon-heading"
          className="text-xl font-bold text-white"
        >
          Have a coupon code?
        </h2>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-300">
          Coupons are applied on the checkout page and shown in your total
          before you pay. Percentage or flat discount, restricted to specific
          plans where the code says so. We also run a{" "}
          <strong>LAUNCH50</strong> launch offer for 50% off your first plan.
        </p>
        {/* Anchored so the plan cards can link straight to checkout. */}
        <div id="checkout" className="scroll-mt-24">
          <CheckoutForm
            plans={plans.filter((p) => !p.isFreeTier).map((p) => ({
              id: p.id,
              name: p.name,
              priceInr: p.priceInr,
              durationDays: p.durationDays,
              lifetime: p.lifetime,
            }))}
            preselectPlan={preselect}
            initialCoupon={coupon}
            isSignedIn={Boolean(user)}
            emailVerified={emailState.verified}
          />
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mt-20">
        <h2 id="faq-heading" className="text-2xl font-bold text-white">
          Pricing questions
        </h2>
        <div className="mt-6 divide-y divide-ink-800 border-y border-ink-800">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-white marker:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-slate-500 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-slate-300">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="mt-0.5 shrink-0 text-mint-400"
        aria-hidden="true"
      >
        <path d="m5 13 4 4L19 7" />
      </svg>
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}

const FREE_FEATURES = [
  "Free quizzes across every topic",
  "A set of full incident scenarios",
  "Instant feedback after each answer",
  "Detailed written explanations",
  "Attempt history and score tracking",
];

const PREMIUM_FEATURES = [
  "Every quiz and every scenario",
  "All new content added while subscribed",
  "Instant feedback after each answer",
  "Detailed written explanations",
  "Attempt history and score tracking",
  "Resume scenarios where you left off",
  "Priority email support",
];

const COMPARISON = [
  { feature: "Free quizzes", free: true, premium: true },
  { feature: "Premium quizzes", free: false, premium: true },
  { feature: "Free incident scenarios", free: true, premium: true },
  { feature: "Premium incident scenarios", free: false, premium: true },
  { feature: "Explanations for every answer", free: true, premium: true },
  { feature: "Score tracking and history", free: true, premium: true },
  { feature: "Everything added while subscribed", free: false, premium: true },
  { feature: "Resume scenario progress", free: false, premium: true },
];

const FAQ = [
  {
    q: "What exactly is free versus Premium?",
    a: "The free tier includes a selection of quizzes in every topic, a set of complete incident scenarios, and all of the feedback, explanation and progress tracking features. Premium unlocks every quiz and every scenario, including new content added while your subscription is active. The exact free selection is marked with a Free badge in the catalogue.",
  },
  {
    q: "Is the price really inclusive of GST?",
    a: `Yes. Listed prices include GST at ${env.gstRate()}%, which is what you pay at checkout. Your invoice breaks the price into the taxable amount and the tax portion, and is emailed to you as a PDF-ready record once payment succeeds.`,
  },
  {
    q: "What happens if I buy again before my current plan expires?",
    a: "The new period is added on top of your remaining access rather than replacing it. Your expiry date moves forward by the new plan's duration, and there is no lost time.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, within 7 days of a first purchase, provided you have not consumed a material portion of the content. Full terms are on the refund policy page.",
  },
  {
    q: "Which payment methods work?",
    a: "UPI, credit and debit cards, netbanking and wallets through Razorpay. UPI is usually the quickest option in India.",
  },
  {
    q: "Is there an auto-renewal?",
    a: "No. Plans end when the period you paid for ends. If you want to continue you buy another plan, which is why there is nothing to cancel and nothing will charge you unexpectedly.",
  },
  {
    q: "Do you offer team or college pricing?",
    a: "Not yet. It is on the roadmap. If you have a team of five or more, get in touch via the contact page and we will work something out.",
  },
];
