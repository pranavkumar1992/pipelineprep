import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { AuthBreadcrumb } from "../layout";
import { ResetPasswordFormClient } from "./reset-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex w-full flex-col items-center">
      <AuthBreadcrumb current="Choose new password" />

      <div className="mt-8 w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2"
            aria-label="PipelinePrep home"
          >
            <Logo className="h-7 w-7 text-brand-400" />
            <span className="font-mono text-lg font-bold text-white">
              PipelinePrep
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Pick something you have not used elsewhere.
          </p>
        </div>

        {token ? (
          <ResetPasswordFormClient token={token} />
        ) : (
          <div className="space-y-4">
            <FormNotice>
              This reset link is missing its token. Request a new link and try
              again.
            </FormNotice>
            <Link
              href="/forgot-password"
              className="flex h-11 w-full items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-sm font-medium text-slate-200 transition-colors hover:bg-ink-700"
            >
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function FormNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-200"
    >
      {children}
    </div>
  );
}
