import "server-only";
import { prisma } from "@/lib/db";
import type { GoogleProfile } from "@/lib/auth/google";

/**
 * Resolves a Google profile to a PipelinePrep user, creating or linking as
 * needed.
 *
 * The interesting case is an email that already belongs to someone. Three
 * outcomes, in order of safety:
 *
 *   1. The Google identity is already linked to a user. Sign in as them. This is
 *      the normal path and the only one that needs no judgement.
 *
 *   2. No account for that email. Create one. Google has already asserted the
 *      address is theirs, so it starts verified and we never send a confirmation
 *      email for something we know to be true.
 *
 *   3. An account exists for that email but has a password, and we are not
 *      signed in. Refuse and send them to password sign-in.
 *
 * Case 3 is the one worth arguing about. Auto-linking would be convenient, but
 *      it turns "someone knows your email address" into "someone can take over
 *      the account", because every passwordless provider has this problem and
 *      the safe pattern is to require the existing credential first. We do not
 *      merge the accounts either: a merge could hand over attempts, progress and
 *      an active subscription, so that needs a deliberate, separate flow.
 */

export type LinkResult =
  | { status: "signed-in"; userId: string }
  | { status: "created"; userId: string }
  | { status: "linked"; userId: string }
  | { status: "account-exists" };

export async function resolveGoogleLogin(profile: GoogleProfile): Promise<LinkResult> {
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: profile.sub,
      },
    },
    select: { userId: true },
  });

  if (existingLink) {
    return { status: "signed-in", userId: existingLink.userId };
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true, passwordHash: true, name: true },
  });

  if (byEmail) {
    // No password means this account has no password credential to protect, so
    // there is nothing to escalate into. Linking is the intended behaviour for
    // an account created through another provider.
    if (byEmail.passwordHash !== null) {
      return { status: "account-exists" };
    }

    await prisma.oAuthAccount.create({
      data: {
        provider: "google",
        providerAccountId: profile.sub,
        providerEmail: profile.email,
        userId: byEmail.id,
      },
    });

    return { status: "linked", userId: byEmail.id };
  }

  const created = await prisma.user.create({
    data: {
      email: profile.email,
      // Google is the only credential, so there is nothing to hash.
      passwordHash: null,
      name: profile.name,
      // Trust Google's assertion. When it is absent the account starts
      // unverified and the user is prompted, rather than the reverse.
      emailVerified: profile.emailVerified,
      ...(profile.emailVerified ? { emailVerifiedVia: "google" } : {}),
      accounts: {
        create: {
          provider: "google",
          providerAccountId: profile.sub,
          providerEmail: profile.email,
        },
      },
    },
    select: { id: true },
  });

  return { status: "created", userId: created.id };
}
