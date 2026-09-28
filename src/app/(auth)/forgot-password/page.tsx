import Link from "next/link";
import type { Metadata } from "next";
import { redirectIfSignedIn } from "@/lib/auth/session";
import { Logo } from "@/components/logo";
import { AuthBreadcrumb } from "../layout";
import { ForgotPasswordFormClient } from "./forgot-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset link for your PipelinePrep account.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  await redirectIfSignedIn();

  return (
    <div className="flex w-full flex-col items-center">
      <AuthBreadcrumb current="Reset password" />

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
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter your email and we will send you a link to choose a new
            password.
          </p>
        </div>

        <ForgotPasswordFormClient />

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="hover:text-slate-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
