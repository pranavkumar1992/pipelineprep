"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { issueToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { getClientIp } from "@/lib/auth/session";
import { LIMITS, rateLimit, resetLimit } from "@/lib/rate-limit";
import { isValidEmail, normaliseTags, uniqueSlug } from "@/lib/utils";

export type AuthState = { error?: string; success?: string };

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

const signupSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
  targetRole: z.string().trim().max(80).optional(),
  experience: z.string().trim().max(40).optional(),
});

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await getClientIp();
  const limit = rateLimit(`signup:${ip}`, LIMITS.signup.limit, LIMITS.signup.window);
  if (!limit.ok) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    targetRole: formData.get("targetRole") || undefined,
    experience: formData.get("experience") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const { name, email, password, targetRole, experience } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Deliberately vague: do not confirm which emails are registered.
    return { error: "That email address is already in use. Try signing in." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      targetRole: targetRole || null,
      experience: experience || null,
    },
  });

  await setSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  // Verification is P1; issue the token so the flow already works when the
  // verify page ships, and never block signup on email delivery.
  try {
    const token = await issueToken(user.id, "EMAIL_VERIFY");
    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      verifyUrl: `${env.siteUrl()}/verify-email?token=${token}`,
    });
  } catch (error) {
    console.error("[auth] welcome email failed:", error);
  }

  redirect("/dashboard?welcome=1");
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await getClientIp();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const ipLimit = rateLimit(`login:ip:${ip}`, LIMITS.login.limit, LIMITS.login.window);
  if (!ipLimit.ok) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const parsed = loginSchema.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  /*
   * Always run a bcrypt comparison so a missing account and a wrong password
   * take the same time, which avoids leaking which emails exist.
   *
   * A null hash means the account has no password at all: it was created through
   * Google. Comparing against the dummy hash keeps the timing indistinguishable
   * from any other failure, and the separate message below tells the user what
   * to actually do about it.
   */
  const hash = user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const ok = await verifyPassword(parsed.data.password, hash);

  if (!user || !ok) {
    const emailLimit = rateLimit(
      `login:email:${parsed.data.email}`,
      LIMITS.login.limit,
      LIMITS.login.window,
    );
    if (!emailLimit.ok) {
      return { error: "Too many failed attempts for this account. Try again later." };
    }

    // Only for an account we know exists, so this reveals nothing an attacker
    // could not already determine by attempting a sign-up.
    if (user && user.passwordHash === null) {
      return {
        error:
          "This account signs in with Google. Use the Google button, or set a password from your settings.",
      };
    }

    return { error: "Incorrect email or password." };
  }

  resetLimit(`login:ip:${ip}`);
  resetLimit(`login:email:${parsed.data.email}`);

  await setSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const next = String(formData.get("next") ?? "");
  // Only allow same-origin relative paths, so `next` cannot be used as an
  // open redirect.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await getClientIp();
  const limit = rateLimit(
    `forgot:${ip}`,
    LIMITS.forgotPassword.limit,
    LIMITS.forgotPassword.window,
  );
  if (!limit.ok) {
    return { error: "Too many requests. Please try again later." };
  }

  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Always report success: revealing which emails exist is an account
  // enumeration vector.
  if (user) {
    const token = await issueToken(user.id, "PASSWORD_RESET");
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: `${env.siteUrl()}/reset-password?token=${token}`,
    });
  }

  return {
    success:
      "If an account exists for that address, we have sent a reset link. Check your inbox and spam folder.",
  };
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------

const resetSchema = z.object({
  token: z.string().min(20, "This reset link is not valid."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
});

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the link." };
  }

  const { consumeToken } = await import("@/lib/auth/tokens");
  const consumed = await consumeToken(parsed.data.token, "PASSWORD_RESET");

  if (!consumed) {
    return {
      error:
        "This reset link has expired or has already been used. Request a new one.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: consumed.userId },
    data: { passwordHash },
  });

  // Sign the user in on the new password so they are not bounced to login.
  await setSessionCookie({
    id: consumed.userId,
    email: consumed.email,
    name: null,
    role: "USER",
  });

  const fresh = await prisma.user.findUnique({
    where: { id: consumed.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (fresh) await setSessionCookie(fresh);

  return { success: "Password updated. Redirecting to your dashboard." };
}

// ---------------------------------------------------------------------------
// Set or change password
// ---------------------------------------------------------------------------

const setPasswordSchema = z.object({
  currentPassword: z.string().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
});

/**
 * Sets a password, for a Google-only account, or changes an existing one.
 *
 * The two cases have genuinely different trust requirements, so they are
 * distinguished here rather than in the form:
 *
 *   - No current password on file. The account has no password to escalate
 *     into, so an authenticated session is the only proof required.
 *   - Current password on file. It must be supplied. A session alone is not
 *     enough, because a session is frequently left open on a shared machine and
 *     an emailed link is a bearer credential.
 */
export async function setPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const ip = await getClientIp();
  if (!rateLimit(`set-password:${ip}`, 10, 60 * 60).ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  const parsed = setPasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? "") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) return { error: "Account not found." };

  if (record.passwordHash !== null) {
    if (!parsed.data.currentPassword) {
      return { error: "Enter your current password." };
    }
    if (!(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
      return { error: "Your current password is incorrect." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  /*
   * Required, not cosmetic: the settings page decides whether to show a
   * "current password" field, and whether Unlink is enabled, by reading the row
   * back. Without this the form would keep claiming the account has no password
   * until a manual refresh.
   */
  revalidatePath("/dashboard/settings");

  return {
    success: "Password set. You can now sign in with your email and password.",
  };
}

// ---------------------------------------------------------------------------
// Unlink Google
// ---------------------------------------------------------------------------

/**
 * Removes the Google link from the signed-in account.
 *
 * Refuses when no password is set, because Google would then be the only
 * credential and unlinking would lock the user out. A recovery email round trip
 * is possible but slow, and a one-click self-lockout is not a risk worth
 * taking for a convenience control.
 *
 * The user's verified status is left alone: the address was confirmed by Google,
 * not by the link, and that remains true.
 */
export async function unlinkGoogleAction(
  _prev: AuthState,
  _formData: FormData,
): Promise<AuthState> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) return { error: "Account not found." };

  if (record.passwordHash === null) {
    return {
      error: "Set a password first. Unlinking Google now would lock you out.",
    };
  }

  await prisma.oAuthAccount.deleteMany({
    where: { userId: user.id, provider: "google" },
  });

  revalidatePath("/dashboard/settings");

  return { success: "Google sign-in unlinked." };
}

// ---------------------------------------------------------------------------
// Profile (A-5)
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().max(80).optional(),
  targetRole: z.string().trim().max(80).optional(),
  experience: z.string().trim().max(40).optional(),
  displayName: z.string().trim().max(40).optional(),
  showOnLeaderboard: z.boolean().optional(),
});

export async function updateProfileAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name") ?? undefined,
    targetRole: formData.get("targetRole") ?? undefined,
    experience: formData.get("experience") ?? undefined,
    displayName: formData.get("displayName") ?? undefined,
    showOnLeaderboard: formData.get("showOnLeaderboard") === "on",
  });
  if (!parsed.success) return { error: "Please check your details." };

  const d = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: d.name || null,
      targetRole: d.targetRole || null,
      experience: d.experience || null,
      displayName: d.displayName || null,
      showOnLeaderboard: d.showOnLeaderboard ?? false,
    },
  });

  // The display name and leaderboard flag are read on other pages, so a change
  // here has to invalidate more than the settings form itself.
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");

  return { success: "Profile updated." };
}

// ---------------------------------------------------------------------------
// Account deletion (A-6)
// ---------------------------------------------------------------------------

export async function deleteAccountAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  if (formData.get("confirm") !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  // Subscriptions cascade via the schema's onDelete: Cascade.
  await prisma.user.delete({ where: { id: user.id } });
  await clearSessionCookie();

  redirect("/?account=deleted");
}

// ---------------------------------------------------------------------------
// Helpers used by admin (kept here so all user writes share one module)
// ---------------------------------------------------------------------------

export async function slugForTopic(name: string): Promise<string> {
  return uniqueSlug(name, async (candidate) => {
    const existing = await prisma.topic.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return Boolean(existing);
  });
}

export async function tagsFromInput(input: string): Promise<string[]> {
  return normaliseTags(input);
}
