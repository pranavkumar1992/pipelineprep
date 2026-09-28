-- Google sign-in support.
--
-- Two changes:
--
-- 1. `passwordHash` becomes nullable. An account created through Google has no
--    password, and a NOT NULL column makes that unrepresentable. The login path
--    treats NULL as "password sign-in unavailable for this account", not as a
--    failed comparison.
--
-- 2. `emailVerifiedVia` records that Google asserted ownership of the address.
--    Google's assertion is stronger evidence than our own emailed link, so those
--    users skip the verification nag.
--
-- `OAuthAccount` holds the linked external identities. The unique pair on
-- (provider, providerAccountId) is what guarantees one Google login maps to
-- exactly one account.
ALTER TABLE "User"
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "emailVerifiedVia" TEXT;

CREATE TABLE IF NOT EXISTS "OAuthAccount" (
  "id"                TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "providerEmail"     TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- One external identity, one account. Re-linking the same Google login to a
-- different user would be an account-takeover vector.
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthAccount_provider_providerAccountId_key"
  ON "OAuthAccount"("provider", "providerAccountId");

CREATE INDEX IF NOT EXISTS "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

DO $$
BEGIN
  -- Scoped to the relation, not just the name: `conname` is not unique across
  -- tables, so a bare name match can find an unrelated constraint and skip
  -- creating the one this table needs.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OAuthAccount_userId_fkey'
      AND conrelid = '"OAuthAccount"'::regclass
  ) THEN
    ALTER TABLE "OAuthAccount"
      ADD CONSTRAINT "OAuthAccount_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
