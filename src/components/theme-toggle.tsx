"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Theme bootstrap.
 *
 * `themeScript` runs in the document head before first paint, so the stored
 * preference is applied without a flash of the wrong theme. It is a string
 * because it must execute synchronously, before React hydrates.
 *
 * Dark remains the default for a first-time visitor.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem('pp-theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("pp-theme", theme);
  } catch {
    // Private browsing or storage disabled: the theme still applies for this
    // page view, it just will not persist.
  }
}

/**
 * Light/dark toggle.
 *
 * The initial state is read from the DOM in an effect rather than during render,
 * because the inline script has already set `data-theme` and reading
 * localStorage during render would produce a hydration mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "dark") setTheme(current);
    setMounted(true);
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next);
        applyTheme(next);
      }}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={
        className ??
        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-slate-300 transition-colors hover:border-brand-400/40 hover:text-white"
      }
    >
      {/* Rendered only after mount so the server and client agree. */}
      {mounted && theme === "light" ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
    </button>
  );
}
