import { cn } from "@/lib/utils";

/** Difficulty badge. Colour is always paired with a text label. */
export function DifficultyBadge({
  level,
  className,
}: {
  level: "EASY" | "MEDIUM" | "HARD";
  className?: string;
}) {
  const styles = {
    EASY: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25",
    MEDIUM: "bg-amber-500/12 text-amber-300 border-amber-500/25",
    HARD: "bg-rose-500/12 text-rose-300 border-rose-500/25",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide",
        styles[level],
        className,
      )}
    >
      {level === "EASY" ? "Easy" : level === "MEDIUM" ? "Medium" : "Hard"}
    </span>
  );
}

/** Premium vs free. Icon + text, not colour alone. */
export function AccessBadge({
  isPremium,
  className,
}: {
  isPremium: boolean;
  className?: string;
}) {
  return isPremium ? (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-brand-400/30 bg-brand-400/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-brand-400",
        className,
      )}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm-3 8V6a3 3 0 1 1 6 0v3H9Z" />
      </svg>
      Premium
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-emerald-300",
        className,
      )}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Z" />
      </svg>
      Free
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
      {children}
    </span>
  );
}

/** Topic identity chip: coloured by topic slug so the catalogue is scannable. */
export function TopicChip({
  name,
  icon,
  slug,
  className,
}: {
  name: string;
  icon?: string | null;
  slug?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-400",
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="text-brand-400">
          {"\u25A6"}
        </span>
      ) : null}
      <span>{name}</span>
      {slug ? <span className="text-slate-600">/ {slug}</span> : null}
    </span>
  );
}
