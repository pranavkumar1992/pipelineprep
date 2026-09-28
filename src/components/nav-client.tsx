"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Menu, Settings, User as UserIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/**
 * Collapsing navigation for small screens (addendum §1). Renders a toggle that
 * opens a full-width panel, and closes on Escape or on route change.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-slate-300 transition-colors hover:text-white"
      >
        {open ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
      </button>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main mobile"
          className="absolute inset-x-0 top-16 z-50 border-b border-ink-800 bg-ink-950 p-4 shadow-xl"
        >
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-ink-800 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-ink-800 pt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-ink-800 hover:text-white"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

/**
 * Account menu (addendum §1): icon plus full name, opening Profile,
 * Subscription and Sign out. Closes on outside click or Escape.
 */
export function UserMenu({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-2.5 text-sm text-slate-200 transition-colors hover:border-brand-400/40"
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-400/15 font-mono text-[11px] font-bold text-brand-400"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        {/* Hidden until there is room: at the md breakpoint the centred nav
            plus this label overflows the 1fr grid track. */}
        <span className="hidden max-w-[9rem] truncate lg:block">{name}</span>
        <ChevronDown size={14} aria-hidden="true" className="text-slate-500" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-xl"
        >
          <div className="border-b border-ink-800 px-4 py-3">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate font-mono text-xs text-slate-500">{email}</p>
          </div>

          <ul className="p-1.5">
            <MenuItem href="/dashboard/settings" icon={<UserIcon size={15} />}>
              Profile
            </MenuItem>
            <MenuItem href="/dashboard/subscription" icon={<Settings size={15} />}>
              Subscription
            </MenuItem>
            {isAdmin ? (
              <MenuItem href="/admin" icon={<Settings size={15} />}>
                Admin panel
              </MenuItem>
            ) : null}
          </ul>

          <form action="/api/auth/logout" method="post" className="border-t border-ink-800 p-1.5">
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-ink-800 hover:text-white"
            >
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        role="menuitem"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors",
          "hover:bg-ink-800 hover:text-white",
        )}
      >
        <span aria-hidden="true" className="text-slate-500">
          {icon}
        </span>
        {children}
      </Link>
    </li>
  );
}
