"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/form-field";
import { AuthErrorBanner, GoogleSignInSection } from "@/components/auth/google-auth";

export function LoginFormClient({
  next,
  googleEnabled,
  errorCode,
}: {
  next?: string;
  googleEnabled: boolean;
  errorCode?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    loginAction,
    {},
  );

  return (
    <div className="space-y-5">
      <AuthErrorBanner code={errorCode} />
      {googleEnabled ? <GoogleSignInSection next={next} /> : null}

      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="••••••••"
      />

      <FormError message={state.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-slate-500">
        <Link href="/forgot-password" className="hover:text-slate-300">
          Forgot your password?
        </Link>
      </p>
      </form>
    </div>
  );
}
