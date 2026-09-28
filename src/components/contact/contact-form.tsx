"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactState } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Textarea } from "@/components/ui/form-field";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    submitContactAction,
    {},
  );

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormSuccess message={state.success} />
        <p className="text-sm text-slate-400">
          If it is urgent, email us directly at the address in the sidebar.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required maxLength={100} autoComplete="name" />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>

      <Field
        label="Subject"
        name="subject"
        maxLength={140}
        placeholder="Billing, content request, correction…"
      />

      <Textarea
        label="Message"
        name="message"
        required
        rows={6}
        maxLength={4000}
        placeholder="Tell us what you need. If it is about a payment, include the payment reference."
        hint="Minimum 10 characters. Maximum 4000."
      />

      {/* Honeypot: hidden from users, tempting to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <FormError message={state.error} />

      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
