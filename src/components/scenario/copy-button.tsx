"use client";

import { useState } from "react";

export function CopyButtonClient({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can be blocked (insecure origin, permissions). Selecting
      // the text is still possible, so this is a soft failure.
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex cursor-pointer items-center gap-1.5 rounded border border-ink-600 px-2 py-1 font-mono text-[11px] text-slate-400 transition-colors hover:border-brand-400/40 hover:text-brand-400"
    >
      <span aria-hidden="true">{copied ? "\u2713" : "\u29C9"}</span>
      {copied ? "Copied" : "Copy"}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
