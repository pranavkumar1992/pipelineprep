"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
};

export function Field({ label, name, hint, className, ...props }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-describedby={hint ? hintId : undefined}
        className={cn(
          "w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition-colors",
          "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30",
          "disabled:opacity-60",
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
  hint?: string;
};

export function Textarea({
  label,
  name,
  hint,
  className,
  ...props
}: TextareaProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        aria-describedby={hint ? hintId : undefined}
        className={cn(
          "w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition-colors",
          "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30",
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  hint?: string;
};

export function Select({
  label,
  name,
  hint,
  className,
  children,
  ...props
}: SelectProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        aria-describedby={hint ? hintId : undefined}
        className={cn(
          "w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-white transition-colors",
          "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Error banner. `role="alert"` so screen readers announce it as soon as the
 * action resolves, rather than the user having to go looking.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

/** Success banner, for non-redirecting actions. */
export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-mint-400/30 bg-mint-400/10 px-3.5 py-3 text-sm text-mint-200"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        aria-describedby={hint ? hintId : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-600 bg-ink-900 text-brand-400 focus:ring-2 focus:ring-brand-400/30"
      />
      <div>
        <label htmlFor={id} className="text-sm text-slate-300">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-0.5 text-xs text-slate-500">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
