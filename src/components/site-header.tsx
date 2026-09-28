import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { Logo } from "@/components/logo";

/** Addendum §1: Daily, Quizzes, Scenarios, Pricing, Dashboard. */
const NAV = [
  { href: "/daily", label: "Daily" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/pricing", label: "Pricing" },
  { href: "/dashboard", label: "Dashboard" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const entitlement = user ? await getEntitlement() : null;
  const isPremium = Boolean(entitlement?.isPremium);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="PipelinePrep home"
          >
            <Logo className="h-6 w-6 text-brand-400" />
            <span className="font-mono text-[15px] font-bold tracking-tight text-white">
              PipelinePrep
            </span>
          </Link>
          {isPremium && user?.role !== "ADMIN" ? (
            <span className="hidden rounded border border-brand-400/30 bg-brand-400/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-brand-400 sm:inline">
              Premium
            </span>
          ) : null}
        </div>

        {/* Centre navigation on desktop, hidden in favour of the mobile menu. */}
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-ink-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />

          {user ? (
            <UserMenu
              name={user.name ?? user.email.split("@")[0] ?? "Account"}
              email={user.email}
              isAdmin={isAdmin(user)}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-md px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-ink-800 hover:text-white sm:block"
              >
                Sign in
              </Link>
              <ButtonLink href="/signup" size="sm">
                Start free
              </ButtonLink>
            </>
          )}

          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
