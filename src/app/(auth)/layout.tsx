import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Shared shell for sign in, sign up and password reset.
 *
 * These pages previously rendered their own bare `min-h-dvh` layout, so they had
 * no site header, no footer and no way back to the marketing site except the
 * browser back button. They now sit inside the normal chrome with a breadcrumb.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * Breadcrumb trail. Every auth page names itself so the trail is correct without
 * each page hand-writing its own markup.
 */
export function AuthBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="w-full max-w-sm">
      <ol className="flex items-center gap-1.5 text-sm text-slate-500">
        <li>
          <Link href="/" className="transition-colors hover:text-brand-400">
            Home
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight size={14} className="text-slate-700" />
        </li>
        <li>
          <Link href="/pricing" className="transition-colors hover:text-brand-400">
            Pricing
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight size={14} className="text-slate-700" />
        </li>
        <li aria-current="page" className="text-slate-300">
          {current}
        </li>
      </ol>
    </nav>
  );
}
