-- Per-plan pricing page copy and a pay-once "lifetime" flag.
--
-- `features` is an array so each plan can carry its own bullet points instead of
-- sharing one hardcoded list across every paid tier. `lifetime` separates
-- "never expires" from "free tier", which both used `durationDays = 0`.
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "lifetime" BOOLEAN NOT NULL DEFAULT FALSE;
