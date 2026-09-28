"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess } from "@/components/ui/form-field";

export function ForgotPasswordFormClient() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    forgotPasswordAction,
    {},
  );

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormSuccess message={state.success} />
        <p className="text-sm text-slate-400">
          The link expires in one hour and can only be used once. Nothing
          happens to your account until you use it.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />

      <FormError message={state.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending link…" : "Send reset link"}
      </Button>
    </form>
  );
}
