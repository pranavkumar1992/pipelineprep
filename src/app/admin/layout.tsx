import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | PipelinePrep" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/topics", label: "Topics" },
  { href: "/admin/quizzes", label: "Quizzes" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/scenarios", label: "Scenarios" },
  { href: "/admin/import", label: "Bulk import" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/career-tools", label: "Career Tools" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin("/admin");

  const [openReports, unreadMessages] = await Promise.all([
    prisma.questionReport.count({ where: { status: "OPEN" } }),
    prisma.contactMessage.count({ where: { handled: false } }),
  ]);

  const badges: Record<string, number> = {
    "/admin/messages": unreadMessages,
    "/admin/questions": openReports,
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-ink-800 bg-ink-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <span aria-hidden="true" className="font-mono text-brand-400">
              {"\u25C6"}
            </span>
            <span className="font-mono text-sm font-bold text-white">
              Admin
            </span>
          </Link>

          <Link
            href="/"
            className="hidden text-sm text-slate-500 hover:text-slate-300 sm:block"
          >
            View site
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden font-mono text-xs text-slate-500 sm:block">
              {admin.email}
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="cursor-pointer rounded-lg border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-ink-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <nav
          aria-label="Admin sections"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                "text-slate-400 hover:bg-ink-800 hover:text-white",
              )}
            >
              {item.label}
              {badges[item.href] ? (
                <span className="rounded-full bg-rose-500/20 px-1.5 font-mono text-[10px] text-rose-300">
                  {badges[item.href]}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
