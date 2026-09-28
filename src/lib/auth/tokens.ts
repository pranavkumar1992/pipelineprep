import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { TokenPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";

const TTL: Record<TokenPurpose, number> = {
  PASSWORD_RESET: 60 * 60, // 1 hour
  EMAIL_VERIFY: 24 * 60 * 60, // 24 hours
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issues a single-use token and returns the raw value to email to the user.
 * Only the SHA-256 hash is stored, so a database leak cannot be replayed.
 */
export async function issueToken(
  userId: string,
  purpose: TokenPurpose,
): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL[purpose] * 1000);

  // Invalidate any outstanding token of the same purpose so only the newest
  // link in an inbox works.
  await prisma.verificationToken.deleteMany({
    where: { userId, purpose, usedAt: null },
  });

  await prisma.verificationToken.create({
    data: { userId, purpose, tokenHash: hashToken(raw), expiresAt },
  });

  return raw;
}

/** Consumes a token if it exists, is unexpired and unused. */
export async function consumeToken(
  raw: string,
  purpose: TokenPurpose,
): Promise<{ userId: string; email: string } | null> {
  const tokenHash = hashToken(raw);

  const found = await prisma.verificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true } } },
  });

  if (
    !found ||
    found.purpose !== purpose ||
    found.usedAt !== null ||
    found.expiresAt.getTime() < Date.now()
  ) {
    return null;
  }

  await prisma.verificationToken.update({
    where: { id: found.id },
    data: { usedAt: new Date() },
  });

  return { userId: found.user.id, email: found.user.email };
}

/** Housekeeping: drop rows that can no longer be used. */
export async function purgeExpiredTokens(): Promise<number> {
  const { count } = await prisma.verificationToken.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  return count;
}
