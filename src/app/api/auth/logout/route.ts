import { NextResponse } from "next/server";
import { logoutAction } from "@/app/actions/auth";

/** Form-compatible sign-out so the header can use a plain <form>. */
export async function POST(request: Request) {
  await logoutAction();
  return NextResponse.redirect(new URL("/", request.url));
}
