import Link from "next/link";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary:
    "bg-brand-400 text-ink-950 hover:bg-brand-500 font-semibold shadow-lg shadow-brand-500/20",
  secondary:
    "bg-ink-800 text-slate-100 hover:bg-ink-700 border border-ink-600 font-medium",
  ghost:
    "text-slate-300 hover:text-white hover:bg-ink-800",
  danger:
    "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 font-medium",
} as const;

const SIZES = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2",
} as const;

type Props = React.ComponentProps<typeof Link> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: Props) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/** For <button> and <form action>. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
