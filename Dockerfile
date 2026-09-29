# syntax=docker/dockerfile:1
#
# Multi-stage build for PipelinePrep.
# Targets a single EC2 instance (docker compose) but produces a standard
# OCI image that also works on ECS Fargate / App Runner without changes.

# --- deps -------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
# Prisma needs a full install (not --omit=dev) because the CLI is used at runtime.
RUN npm ci --no-audit --no-fund

# --- builder ----------------------------------------------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma schema is required for client generation.
# prisma.config.ts calls env("DATABASE_URL") — provide a dummy so `generate`
# can load the config without a real DB. It only reads the schema, never connects.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# Standalone output keeps the runtime image small.
RUN npm run build

# --- runner -----------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Runtime deps only (next, prisma client, bcryptjs, nodemailer, razorpay).
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# Prisma 7 resolves the schema path and the datasource URL from this root config;
# the schema itself declares no `url`. Without it, `prisma migrate deploy` cannot
# find either, so it has to travel into the runtime image alongside the
# migrations themselves.
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

# Applies pending migrations, then starts the server. See docker/entrypoint.sh.
ENTRYPOINT ["/app/docker/entrypoint.sh"]
