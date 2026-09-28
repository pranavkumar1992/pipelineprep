"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";
import type { AdminState } from "@/app/actions/admin";

/**
 * Collapsible form panel for the admin panel.
 *
 * `action` must be a server action imported from a `"use server"` module, and
 * `children` is plain JSX. Server components cannot pass functions to client
 * components, so the render-prop shape used earlier is not possible: the panel
 * owns the action state and renders its own error and success messages.
 */
export function AdminEditor({
  title,
  action,
  defaultOpen = false,
  children,
}: {
  title: string;
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    action,
    {},
  );
  const [open, setOpen] = useState(defaultOpen);

  // Keep the panel open on success so the confirmation stays visible.
  useEffect(() => {
    if (state.ok) setOpen(true);
  }, [state.ok]);

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="text-sm font-medium text-white">{title}</span>
        <span aria-hidden="true" className="text-slate-500">
          {open ? "\u2212" : "+"}
        </span>
      </button>

      {open ? (
        <form
          action={formAction}
          className="space-y-4 border-t border-ink-800 p-5"
        >
          {children}

          <FormError message={state.error} />
          <FormSuccess message={state.message} />

          {state.summary && state.summary.errors.length > 0 ? (
            <details className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm">
              <summary className="cursor-pointer text-amber-200">
                {state.summary.errors.length} row(s) skipped
              </summary>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-amber-200/80">
                {state.summary.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/**
 * One-click action in a table row, such as delete or toggle.
 *
 * `action` must be a server action. Use the `confirm` prop rather than wrapping
 * the action in a closure, since a plain function cannot cross the server/client
 * boundary.
 */
export function RowAction({
  label,
  action,
  fields,
  confirm,
  variant = "danger",
  className,
}: {
  label: string;
  action: (prev: AdminState, formData: FormData) => Promise<AdminState>;
  fields: Record<string, string | boolean>;
  confirm?: string;
  variant?: "danger" | "secondary";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className={cn("inline", className)}>
      {Object.entries(fields).map(([name, value]) =>
        typeof value === "boolean" ? (
          value ? <input key={name} type="hidden" name={name} value="on" /> : null
        ) : (
          <input key={name} type="hidden" name={name} value={value} />
        ),
      )}

      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
        className={cn(
          "cursor-pointer rounded-md px-2 py-1 font-mono text-[11px] transition-colors disabled:opacity-50",
          variant === "danger"
            ? "text-rose-400 hover:bg-rose-500/10"
            : "text-slate-400 hover:bg-ink-800 hover:text-white",
        )}
      >
        {pending ? "…" : label}
      </button>

      {state.message ? (
        <span className="ml-2 font-mono text-[11px] text-slate-500">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

/** Reusable labelled input for admin forms. */
export function AInput({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  hint,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={`f-${name}`}
        className="block text-xs font-medium text-slate-400"
      >
        {label}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
      />
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ATextarea({
  label,
  name,
  defaultValue,
  rows = 4,
  required,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={`f-${name}`}
        className="block text-xs font-medium text-slate-400"
      >
        {label}
      </label>
      <textarea
        id={`f-${name}`}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
      />
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ASelect({
  label,
  name,
  defaultValue,
  options,
  hint,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={`f-${name}`}
        className="block text-xs font-medium text-slate-400"
      >
        {label}
      </label>
      <select
        id={`f-${name}`}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ACheckbox({
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
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-ink-600 bg-ink-850 text-brand-400 focus:ring-2 focus:ring-brand-400/30"
      />
      <span>
        <span className="text-sm text-slate-300">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}
