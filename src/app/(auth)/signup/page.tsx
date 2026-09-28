import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { redirectIfSignedIn } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { Logo } from "@/components/logo";
import { AuthBreadcrumb } from "../layout";
import { SignupFormClient } from "./signup-form";

export const metadata: Metadata = {
  title: "Create a free account",
  description:
    "Start practising DevOps for free. Topic-wise quizzes with detailed explanations and real-world incident scenarios.",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  await redirectIfSignedIn();

  return (
    <div className="flex w-full flex-col items-center">
      <AuthBreadcrumb current="Create account" />

      <div className="mt-8 w-full max-w-md">
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
            Create your free account
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            No card required. Free quizzes across every topic, plus a set of full
            incident walkthroughs.
          </p>
        </div>

        <SignupFormClient googleEnabled={env.googleEnabled} />

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-400 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
