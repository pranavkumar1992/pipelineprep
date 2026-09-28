import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getEmailVerificationState } from "@/lib/auth/entitlement";

const PRACTISE_LINKS = [
  { href: "/quizzes", label: "All quizzes" },
  { href: "/daily", label: "Daily challenge" },
  { href: "/scenarios", label: "Incident scenarios" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/performance", label: "Your performance" },
];

const SIGNED_OUT_LINKS = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Create account" },
  { href: "/forgot-password", label: "Reset password" },
];

/**
 * Signed-in links.
 *
 * A confirmed address is the only one that can be acted on, so it only appears
 * when there is something to confirm. Once confirmed, the link would be a no-op
 * and is dropped rather than shown as permanently satisfied.
 */
const SIGNED_IN_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/subscription", label: "Subscription" },
  { href: "/dashboard/settings", label: "Account settings" },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refund", label: "Refund policy" },
  { href: "/shipping", label: "Shipping & delivery" },
  { href: "/contact", label: "Contact us" },
];

export async function SiteFooter() {
  const year = new Date().getFullYear();

  /*
   * The Account column changes with the session. Three of the signed-out links
   * redirect a signed-in visitor straight back to the dashboard, so leaving
   * them in produced links that visibly did nothing.
   *
   * This is also where a signed-out visitor is most likely to look for
   * "resend my confirmation", so the unconfirmed address gets a direct link
   * rather than making them find the dashboard banner.
   */
  const session = await getSession();
  const verification = await getEmailVerificationState();
  const needsConfirmation = Boolean(session) && !verification.verified;

  const accountLinks = session
    ? [
        ...SIGNED_IN_LINKS,
        ...(needsConfirmation
          ? [
              {
                href: "/dashboard",
                label: "Resend confirmation",
              },
            ]
          : []),
      ]
    : SIGNED_OUT_LINKS;

  const columns = [
    { title: "Practise", links: PRACTISE_LINKS },
    { title: "Account", links: accountLinks },
    { title: "Legal", links: LEGAL_LINKS },
  ];

  return (
    <footer className="mt-20 border-t border-ink-800 bg-ink-900">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="font-mono text-lg font-bold text-brand-400"
              >
                {"\u25C6"}
              </span>
              <span className="font-mono text-[15px] font-bold text-white">
                PipelinePrep
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
              DevOps practice quizzes and real-world incident walkthroughs.
              Built by an AWS and DevOps practitioner, not a content factory.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-brand-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-ink-800 pt-6">
          <p className="text-xs leading-relaxed text-slate-500">
            We do not provide cloud credits or hands-on lab environments.
            PipelinePrep is practice material and incident walkthroughs only.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            &copy; {year} PipelinePrep. Digital products, delivered instantly.
          </p>
        </div>
      </div>
    </footer>
  );
}
