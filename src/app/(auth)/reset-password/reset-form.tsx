"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetPasswordAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/form-field";

export function ResetPasswordFormClient({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    resetPasswordAction,
    {},
  );

  // The action signs the user in, so on success move them to the dashboard.
  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => router.push("/dashboard"), 1200);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        hint="A passphrase of a few words works well and is easier to remember."
      />

      <FormError message={state.error} />

      {state.success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-mint-400/30 bg-mint-400/10 px-3.5 py-3 text-sm text-mint-200"
        >
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-mint-400/30 border-t-mint-400" />
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
