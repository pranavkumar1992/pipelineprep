import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { isCareerToolsLive } from "@/lib/settings";
import { unsubscribeWaitlistAction } from "@/app/actions/career-tools";

export const dynamic = "force-dynamic";

/**
 * Waitlist unsubscribe (addendum). Reached from the link in the confirmation
 * email, so it must work without a session.
 *
 * The email address travels in the query string, which is unavoidable for an
 * email link. It is used only to locate the row and is never logged here.
 */
export async function GET(request: Request) {
  if (!(await isCareerToolsLive())) notFound();

  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  await unsubscribeWaitlistAction(email);

  // Redirect to a human-readable confirmation rather than showing JSON.
  return NextResponse.redirect(new URL("/career-tools?unsubscribed=1", url));
}
