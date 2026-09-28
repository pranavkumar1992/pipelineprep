import Link from "next/link";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="font-mono text-6xl font-bold text-brand-400">404</p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">
        Page not found
      </h1>
      <p className="mt-4 text-slate-400">
        That link does not lead anywhere. It may have moved, or the quiz or
        scenario may have been retired.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/quizzes">Browse quizzes</ButtonLink>
        <ButtonLink href="/scenarios" variant="secondary">
          Browse scenarios
        </ButtonLink>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>
        <Link href="/pricing" className="hover:text-slate-300">
          Pricing
        </Link>
        <Link href="/contact" className="hover:text-slate-300">
          Contact
        </Link>
      </div>
    </div>
  );
}
