"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Select } from "@/components/ui/form-field";
import { GoogleSignInSection } from "@/components/auth/google-auth";
import { cn } from "@/lib/utils";

const ROLES = [
  "DevOps engineer",
  "SRE",
  "Cloud engineer",
  "Platform engineer",
  "Backend developer moving to DevOps",
  "System administrator",
  "Student / fresher",
  "Other",
];

const EXPERIENCE = [
  "Fresher (0-1 yr)",
  "Junior (1-2 yrs)",
  "Mid (2-4 yrs)",
  "Senior (4-7 yrs)",
  "Lead (7+ yrs)",
];

export function SignupFormClient({
  googleEnabled,
}: {
  googleEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signupAction,
    {},
  );
  const [password, setPassword] = useState("");

  // Length is the dominant factor in password strength, so gate on it and show
  // progress rather than an arbitrary composite score.
  const strength = scorePassword(password);

  return (
    <div className="space-y-5">
      {googleEnabled ? <GoogleSignInSection variant="signup" /> : null}

      <form action={formAction} className="space-y-4">
      <Field
        label="Name"
        name="name"
        autoComplete="name"
        required
        placeholder="Your name"
        maxLength={80}
      />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />

      <div className="space-y-1.5">
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {password ? (
          <div className="flex items-center gap-2.5 pt-0.5">
            <div
              className="h-1 flex-1 overflow-hidden rounded-full bg-ink-700"
              role="presentation"
            >
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  strength.bar,
                  strength.width,
                )}
              />
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {strength.label}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Use 8+ characters. A passphrase works well.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Target role" name="targetRole" defaultValue="">
          <option value="">Not set</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
        <Select label="Experience" name="experience" defaultValue="">
          <option value="">Not set</option>
          {EXPERIENCE.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </div>

      <FormError message={state.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create free account"}
      </Button>

      <p className="text-center text-xs leading-relaxed text-slate-500">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="text-slate-400 underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-slate-400 underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      </form>
    </div>
  );
}

function scorePassword(password: string) {
  if (password.length < 8) {
    return { label: "too short", bar: "bg-rose-500", width: "w-1/5" };
  }

  let points = 0;
  if (password.length >= 12) points += 2;
  else if (password.length >= 10) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  if (points <= 1) return { label: "weak", bar: "bg-rose-500", width: "w-1/5" };
  if (points <= 2) return { label: "fair", bar: "bg-amber-500", width: "w-2/5" };
  if (points <= 3) return { label: "good", bar: "bg-brand-400", width: "w-3/5" };
  if (points <= 4) return { label: "strong", bar: "bg-mint-400", width: "w-4/5" };
  return { label: "very strong", bar: "bg-mint-400", width: "w-full" };
}
