import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, redirectIfSignedIn } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { Logo } from "@/components/logo";
import { AuthBreadcrumb } from "../layout";
import { LoginFormClient } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to PipelinePrep to continue your DevOps practice.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  await redirectIfSignedIn();

  const { next, error } = await searchParams;

  return (
    <div className="flex w-full flex-col items-center">
      <AuthBreadcrumb current="Sign in" />

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
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to continue your practice.
          </p>
        </div>

        <LoginFormClient
          next={next}
          googleEnabled={env.googleEnabled}
          errorCode={error}
        />

        <p className="mt-6 text-center text-sm text-slate-400">
          New to PipelinePrep?{" "}
          <Link href="/signup" className="text-brand-400 underline underline-offset-4">
            Create a free account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="hover:text-slate-400">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
