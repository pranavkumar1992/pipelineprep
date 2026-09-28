"use client";

import { useActionState } from "react";
import {
  deleteAccountAction,
  setPasswordAction,
  unlinkGoogleAction,
  updateProfileAction,
  type AuthState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, FormSuccess, Select } from "@/components/ui/form-field";

export function ProfileSettingsForm({
  user,
}: {
  user: {
    name: string | null;
    email: string;
    targetRole: string | null;
    experience: string | null;
    displayName: string | null;
    showOnLeaderboard: boolean;
    emailVerified: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    updateProfileAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          name="name"
          defaultValue={user.name ?? ""}
          maxLength={80}
          autoComplete="name"
        />
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-300">
            Email
          </span>
          <input
            value={user.email}
            readOnly
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-sm text-slate-500"
          />
          <p className="text-xs text-slate-500">
            {user.emailVerified
              ? "Verified."
              : "Unverified. Check your inbox for the verification link."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Target role"
          name="targetRole"
          defaultValue={user.targetRole ?? ""}
        >
          <option value="">Not set</option>
          {[
            "DevOps engineer",
            "SRE",
            "Cloud engineer",
            "Platform engineer",
            "Backend developer moving to DevOps",
            "System administrator",
            "Student / fresher",
            "Other",
          ].map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>

        <Select
          label="Experience"
          name="experience"
          defaultValue={user.experience ?? ""}
        >
          <option value="">Not set</option>
          {[
            "Fresher (0-1 yr)",
            "Junior (1-2 yrs)",
            "Mid (2-4 yrs)",
            "Senior (4-7 yrs)",
            "Lead (7+ yrs)",
          ].map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-3 border-t border-ink-800 pt-5">
        <legend className="font-mono text-xs uppercase tracking-wider text-slate-500">
          Leaderboard
        </legend>
        <Checkbox
          label="Show me on the leaderboard"
          name="showOnLeaderboard"
          defaultChecked={user.showOnLeaderboard}
          hint="Uses your display name. Leave this off to stay private."
        />
        <Field
          label="Display name"
          name="displayName"
          defaultValue={user.displayName ?? ""}
          maxLength={40}
          placeholder="How you appear on the leaderboard"
          disabled={!user.showOnLeaderboard}
          hint={
            user.showOnLeaderboard
              ? "Leave blank to use your account name."
              : "Enable the leaderboard above to set a display name."
          }
        />
      </fieldset>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

/**
 * Password set / change.
 *
 * The current-password field is only rendered when there is one to supply. For
 * a Google-only account there is no password yet, so demanding one would make
 * the form impossible to fill in; the account is authenticated by its session.
 */
export function PasswordSettingsForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    setPasswordAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {hasPassword ? (
        <Field
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      ) : null}

      <Field
        label={hasPassword ? "New password" : "Set a password"}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        hint={
          hasPassword
            ? undefined
            : "Your account was created with Google, so it has no password yet. Setting one lets you sign in either way."
        }
      />

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
      </Button>
    </form>
  );
}

/**
 * Linked sign-in methods.
 *
 * Unlinking is only offered when a password exists. Removing the only way in
 * would lock the user out with no recovery path short of an email round trip, and
 * a control that can lock someone out of their own account should not be one
 * click away.
 */
export function LinkedAccountsSection({
  googleLinked,
  hasPassword,
  googleEnabled,
}: {
  googleLinked: boolean;
  hasPassword: boolean;
  googleEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    unlinkGoogleAction,
    {},
  );

  const canUnlink = googleLinked && hasPassword;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 bg-ink-850"
          >
            <svg width="17" height="17" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H1v2.33A9 9 0 0 0 9 18Z"
              />
              <path
                fill="#FBBC05"
                d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H1a9 9 0 0 0 0 8.1l2.97-2.33Z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 1 4.95l2.97 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-slate-200">Google</p>
            <p className="text-xs text-slate-500">
              {googleLinked ? "Linked to this account" : "Not linked"}
            </p>
          </div>
        </div>

        {googleLinked ? (
          <form action={formAction}>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!canUnlink || pending}
              title={
                canUnlink
                  ? undefined
                  : "Set a password before unlinking, so you can still sign in."
              }
            >
              {pending ? "Unlinking…" : "Unlink"}
            </Button>
          </form>
        ) : googleEnabled ? (
          <a
            href="/api/auth/google?next=%2Fdashboard%2Fsettings"
            className="inline-flex h-9 items-center rounded-lg border border-ink-600 bg-ink-800 px-3.5 text-sm font-medium text-slate-200 transition-colors hover:border-ink-500 hover:bg-ink-700"
          >
            Link Google
          </a>
        ) : null}
      </div>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      {googleLinked && !hasPassword ? (
        <p className="text-xs leading-relaxed text-slate-500">
          Set a password below before unlinking Google, otherwise this would be
          the only way to sign in to your account.
        </p>
      ) : null}
    </div>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    deleteAccountAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-300">
          Type <span className="font-mono text-rose-400">DELETE</span> to confirm
        </label>
        <input
          id="confirm"
          name="confirm"
          placeholder="DELETE"
          autoComplete="off"
          className="w-full max-w-xs rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
        />
      </div>

      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Deleting…" : "Permanently delete my account"}
      </Button>
    </form>
  );
}
