import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared layout for the legal pages. Consistent header, breadcrumb,
 * "last updated" line, and typography for long-form prose.
 */
export function LegalPage({
  title,
  updated,
  description,
  children,
}: {
  title: string;
  updated?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    // The page wrapper owns the gutters. Previously each legal page supplied its
    // own container and some used none, so long prose ran flush to the viewport
    // edge on narrow screens.
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-1.5 text-sm text-slate-500">
          <li>
            <Link href="/" className="transition-colors hover:text-brand-400">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight size={14} className="text-slate-700" />
          </li>
          <li aria-current="page" className="text-slate-300">
            {title}
          </li>
        </ol>
      </nav>

      <article>
        <header className="border-b border-ink-800 pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 text-slate-400">{description}</p>
          ) : null}
          {updated ? (
            <p className="mt-4 font-mono text-xs text-slate-500">
              Last updated: {updated}
            </p>
          ) : null}
        </header>

        <div className="mt-8">{children}</div>
      </article>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
  className,
}: {
  heading: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-10", className)}>
      <h2 className="mb-3 text-xl font-semibold tracking-tight text-white">
        {heading}
      </h2>
      <div className="space-y-4 text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

/** Bold inline label for list-style provisions inside a LegalSection. */
export function Clause({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <span className="shrink-0 font-mono text-xs text-brand-400 sm:w-44 sm:pt-1">
        {label}
      </span>
      <div className="flex-1 text-slate-300 leading-relaxed">{children}</div>
    </div>
  );
}

export function LegalNote({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        tone === "warning"
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-slate-700 bg-slate-800/50",
      )}
    >
      {title ? (
        <p
          className={cn(
            "mb-2 font-semibold",
            tone === "warning" ? "text-amber-300" : "text-slate-200",
          )}
        >
          {title}
        </p>
      ) : null}
      <div className="text-sm leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}
