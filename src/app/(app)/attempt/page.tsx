import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { AttemptClient } from "./attempt-client";

export const metadata: Metadata = {
  title: "Attempt in progress",
  robots: { index: false, follow: false },
};

export default async function AttemptPage() {
  await requireUser("/quizzes");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <AttemptClient />
    </div>
  );
}
