# Deploying PipelinePrep to AWS

Ordered procedure for launching this app in production. Written against this
repository as it actually stands — verify each step before moving on, because
several of the failure modes below surface as a site that looks fine and quietly
does nothing.

- [Architecture](#architecture)
- [Before you start](#before-you-start)
- [Blockers to clear first](#blockers-to-clear-first)
- [1. Domain and DNS](#1-domain-and-dns)
- [2. RDS PostgreSQL](#2-rds-postgresql)
- [3. Security groups](#3-security-groups)
- [4. Amazon SES](#4-amazon-ses)
- [5. The EC2 instance](#5-the-ec2-instance)
- [6. First deploy](#6-first-deploy)
- [7. Razorpay](#7-razorpay)
- [8. Google sign-in](#8-google-sign-in)
- [9. Verify](#9-verify)
- [Environment reference](#environment-reference)
- [Deploying an update](#deploying-an-update)
- [Rollback](#rollback)
- [Backups](#backups)
- [Scheduled housekeeping](#scheduled-housekeeping)
- [When to move off a single instance](#when-to-move-off-a-single-instance)

---

## Architecture

| Concern | Choice | Why |
|---|---|---|
| Compute | 1 × EC2 `t4g.small`, Docker Compose | Cheapest thing that works. The Dockerfile already targets this. |
| TLS | Caddy in the same Compose stack | Obtains and renews its own certificate. No ACM, no ALB, nothing to renew by hand. |
| Database | RDS PostgreSQL 16 | Backups, failover and point-in-time recovery. Never in a container on the app instance. |
| Email | Amazon SES SMTP | Cheap, and the only mail path that does not need a third-party account. |
| Secrets | `.env.production` on the instance, `chmod 600` | Pragmatic for one box. Secrets Manager is the upgrade once you want rotation. |
| Domain | Route 53 | Alias to the instance's Elastic IP. |

Approximate monthly cost at low traffic:

| Item | Cost |
|---|---|
| EC2 `t4g.small` | ~$17 |
| RDS `db.t4g.small` | ~$25 |
| Elastic IP (associated) | ~$3.60 |
| EBS 30 GB gp3 | ~$2.40 |
| SES (first 1,000 emails/mo free) | $0 |
| Route 53 (hosted zone, ~$0.50/50M queries) | ~$0.50 |
| **Total** | **~$49** |

Fargate + ALB instead would land nearer $110/month at this traffic level, so
single-instance is the right starting point. See
[when to move off](#when-to-move-off-a-single-instance).

### What is not included

Docker is **not** available on the development machine this was built on, so the
image build and the Compose stack have not been executed end to end. Everything
below the image — migrations, the entrypoint's logic, the app's behaviour — has
been verified against a real database locally. Treat the first
`docker compose up` as the point where the container plumbing gets its first
real test, and watch the logs.

---

## Before you start

- [ ] An AWS account, and a budget alarm on the billing console. Set it before
      creating resources, not after.
- [ ] A domain. `pipelineprep.in` is used throughout these docs — substitute
      yours, and substitute it *everywhere*, including the Google and Razorpay
      settings later.
- [ ] Docker Desktop or Docker Engine locally, to test the build before you ever
      touch the instance.
- [ ] `docker login` to an ECR repository, if you would rather push an image than
      build on the instance. Optional; see [deploying an update](#deploying-an-update).
- [ ] This repository in version control. **It is not a git repository.** That is
      the single largest risk in this document: there is no history, no way to
      see what changed, and no way to roll back a bad deploy. Initialise git and
      push to a private repository *before* the first deploy.

```sh
git init
git add -A
git commit -m "Initial commit"
```

`node_modules`, `.next`, `.env` and `.env.production` are already gitignored.

---

## Blockers to clear first

These are not infrastructure problems. They are things that will be live the
moment the site is public, and each one is cheap to fix now and expensive later.

### 1. The database contains test payment credentials

The `Setting` table has leftover values from testing the admin settings page:

| Key | Current value |
|---|---|
| `razorpay.key_id` | `rzp_test_1234567890abcd` |
| `razorpay.key_secret` | `supersecretkeyvalue1234567890` |
| `razorpay.webhook_secret` | `webhooksecret1234567890abcdef` |

Environment variables take precedence over these rows, so setting real
`RAZORPAY_*` values in `.env.production` neutralises them. But they are still
sitting in the database, and they become live again the moment someone removes an
env var. Delete them once the real keys are in place, either from
`/admin/settings` or directly:

```sql
DELETE FROM "Setting" WHERE key LIKE 'razorpay.%';
```

### 2. Change the admin password

`admin@pipelineprep.in` currently has the password `ChangeMe!2026`, published in
this project's own notes. Change it before the site is reachable from the
internet. `admin@pipelineprep.in` is an address you control and is already
verified, so it is exempt from the checkout email gate.

### 3. Business details are required on invoices

`BUSINESS_GSTIN`, `BUSINESS_ADDRESS` and `SUPPORT_PHONE` are all empty. They are
rendered onto every invoice and onto the legal and refund pages, and the code
omits each block entirely when the value is blank — so an invoice will go out
with no GSTIN and no registered address. For digital goods sold to Indian
customers that is a compliance problem, not a cosmetic one.

Set all three in `.env.production`, then check:

- `https://YOUR-DOMAIN/refund` shows the registered address
- a test invoice shows the GSTIN and the 18% GST split

### 4. Decide on the Career Tools teaser

`CAREER_TOOLS_ENABLED` is `false` in the environment but `true` in the database
row `feature.career_tools_enabled`. Environment wins, so the teaser is currently
hidden and `/career-tools/*` 404s. Set the variable to `true` to switch it on, or
leave it off. Just be aware the two sources currently disagree.

---

## 1. Domain and DNS

In the Route 53 console, create a hosted zone for your domain if you have not
already, then:

1. Create an **Elastic IP** under EC2 → Network interfaces → Elastic IPs →
   Allocate. Associate it to the instance in step 5.
2. Create an **A record**: `pipelineprep.in` → Elastic IP (Alias, or type A with
   the address).
3. Optionally a `www` CNAME pointing at the root.

Verify before continuing — certificate issuance fails if DNS has not propagated:

```sh
nslookup pipelineprep.in
```

---

## 2. RDS PostgreSQL

RDS → Databases → Create database.

| Setting | Value | Note |
|---|---|---|
| Engine | PostgreSQL 16 | Matches the local image and the migrations. |
| Template | Free tier | |
| DB instance identifier | `pipelineprep` | |
| Credentials | **Record these.** Generated ones are fine. | |
| DB name | `pipelineprep` | |
| Instance class | `db.t4g.small` | `db.t4g.micro` works at launch; you will want `small` before real traffic. |
| Storage | 30 GB gp3 | Autoscaling on is reasonable. |
| **Public access** | **No** | |
| Security group | `sg-pipelineprep-db` (created in step 3) | |
| **Initial database name** | `pipelineprep` | **Tick this.** The entrypoint seeds only an empty database. |
| Maintenance window | 04:00–05:00 UTC | Low-traffic hours. |
| **Delete protection** | **Enable** | Stops an accidental `DROP DATABASE` at the console. |
| **Backup retention** | 7 days | Free tier allows 1; 7 costs roughly the same. |
| Deletion protection | Enable | |
| Auto minor version upgrade | Enable | |

Untick **Enable IAM database authentication** — this app connects with a
password through `pg`, not IAM tokens.

### Build `DATABASE_URL`

The app connects via `pg` through a Prisma driver adapter, so this is a plain
`pg` connection string. `connection_limit` and `pool_timeout` are `pg` pool
options, and they are what keeps the app from exhausting the instance's
`max_connections`:

```
postgresql://USER:PASSWORD@pipelineprep.XXXXXX.REGION.rds.amazonaws.com:5432/pipelineprep?schema=public&connection_limit=10&pool_timeout=20
```

Keep `connection_limit` comfortably below `max_connections`. `db.t4g.small`
allows roughly 25–30 in practice; 10 leaves ample headroom for the Prisma CLI,
admin sessions, and a second container during a rolling deploy.

> **Password in a connection string.** If the password contains `@`, `:`, `/` or
> `#`, it must be percent-encoded or the connection string silently truncates at
> the wrong character. Easiest fix is to regenerate the master password with
> alphanumeric-only characters.

Do not put this URL in `docker-compose.prod.yml`. It goes in `.env.production`
on the instance only.

---

## 3. Security groups

Three groups. The app instance is deliberately not open to the world on 22 —
see the note below.

**`sg-pipelineprep-db`** — inbound:

| Type | Port | Source |
|---|---|---|
| PostgreSQL | 5432 | `sg-pipelineprep-app` |

Source is the security group, not an IP range. No egress changes needed.

**`sg-pipelineprep-app`** — inbound:

| Type | Port | Source |
|---|---|---|
| HTTP | 80 | `0.0.0.0/0` |
| HTTPS | 443 | `0.0.0.0/0` |
| SSH | 22 | **Your own IP only** |

> On SSH: `0.0.0.0/0` on port 22 is scanned continuously within minutes of an
> instance going public. Restrict the source to your own fixed IP, or tunnel
> through Session Manager and delete the rule entirely. The Session Manager
> option costs nothing and removes the attack surface — it is worth the setup.

> On 80: it is not optional. Caddy uses it for the ACME HTTP-01 challenge, and
> without it the first certificate never issues and every renewal fails.

---

## 4. Amazon SES

Email is not optional here — email confirmation, password reset and invoices all
depend on it.

1. SES → **Email addresses** → **Verify a new email address**. Verify
   `no-reply@YOUR-DOMAIN` and your own address.
2. SES → **Email addresses** → **Request production access**.
   This is a separate step and is almost always the one that gets skipped. In
   the **sandbox**, SES will only ever send *to addresses you have verified* —
   so password resets and confirmation emails to real customers silently fail
   while everything appears healthy. Production access is granted automatically
   for most accounts within 24 hours; sometimes it requires justification.
3. SES → **SMTP credentials** → **Create credentials**. Note the generated
   SMTP username and password — this is the only time the password is shown.

Fill in:

```
SMTP_HOST=email-smtp.REGION.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<generated SMTP username>
SMTP_PASSWORD=<generated SMTP password>
EMAIL_FROM="PipelinePrep <no-reply@YOUR-DOMAIN>"
```

**Sandbox behaviour is the thing to check after deploying.** If signup succeeds
but no confirmation email arrives, you are still in the sandbox. `docker compose
logs -f app` prints every email to stdout when `SMTP_HOST` is blank, so you can
confirm the flow works before blaming SES.

---

## 5. The EC2 instance

EC2 → Instances → Launch instance.

| Setting | Value |
|---|---|
| Name | `pipelineprep-app` |
| AMI | Ubuntu Server 24.04 LTS, `aarch64` |
| Instance type | `t4g.small` (Graviton) |
| Key pair | Create or select an existing one — **you need the `.pem`** |
| Security group | `sg-pipelineprep-app` |
| Storage | 30 GB gp3 |

> **Architecture.** `t4g` is ARM. The base image and Prisma both support
> `linux-arm64`, and the image is built on the instance so it matches the host
> automatically. If you would rather not think about it, choose `t3.small`
> (`x86_64`) instead — identical architecture behaviour, slightly more expensive.

Once running, SSH in:

```sh
ssh -i YOUR_KEY.pem ubuntu@YOUR_EC2_IP
```

Install Docker:

```sh
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker
```

Confirm:

```sh
docker --version && docker compose version
```

Copy the deployment files across. `scp` the repository, or clone it:

```sh
scp -r Caddyfile docker-compose.prod.yml Dockerfile docker/ ubuntu@YOUR_EC2_IP:~/app/
scp -r prisma/ package.json package-lock.json prisma.config.ts next.config.ts tsconfig.json postcss.config.mjs src/ public/ ubuntu@YOUR_EC2_IP:~/app/
```

> `public/` must exist even though it is nearly empty — the Dockerfile's final
> `COPY` fails outright if the path is absent, and the failure is not obvious
> from the error.

Create the production environment file:

```sh
nano ~/app/.env.production
chmod 600 ~/app/.env.production
```

```sh
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://pipelineprep.in

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/pipelineprep?schema=public&connection_limit=10&pool_timeout=20

# REQUIRED. Without it the app throws on first request. Generate with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
AUTH_SECRET=

SMTP_HOST=email-smtp.REGION.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="PipelinePrep <no-reply@pipelineprep.in>"

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Leave blank: defaults to ${NEXT_PUBLIC_SITE_URL}/api/auth/google/callback

BUSINESS_NAME="PipelinePrep"
BUSINESS_GSTIN=
BUSINESS_ADDRESS=
BUSINESS_SUPPORT_EMAIL=support@pipelineprep.in
SUPPORT_PHONE=

GST_RATE=18
CAREER_TOOLS_ENABLED=false
CRON_SECRET=
```

Then confirm the ownership bits are right:

```sh
chmod 600 ~/app/.env.production
```

---

## 6. First deploy

```sh
cd ~/app
docker compose -f docker-compose.prod.yml up -d --build
```

The build takes a few minutes. Watch it:

```sh
docker compose -f docker-compose.prod.yml logs -f app
```

Expected, in order:

```
[entrypoint] waiting for postgres…
[entrypoint] database is up.
[entrypoint] applying migrations…
[entrypoint] checking whether content needs seeding…
[entrypoint] empty database — seeding content (first boot only)…
[entrypoint] starting server on :3000
```

Then Caddy:

```sh
docker compose -f docker-compose.prod.yml logs -f caddy
```

Caddy requests a certificate on first start. Within about 30 seconds:

```
certificate obtained successfully
```

Check the app's own health, from inside the network so TLS is not involved:

```sh
docker compose -f docker-compose.prod.yml exec app curl -fsS http://localhost:3000/api/health
```

```json
{ "status": "ok", "database": "reachable", "latencyMs": 3, "timestamp": "..." }
```

A `503` here means the app cannot reach RDS. Check the security group source and
the percent-encoding of the password in `DATABASE_URL`.

Then over HTTPS:

```sh
curl -sI https://pipelineprep.in | head -1
# HTTP/2 200
```

---

## 7. Razorpay

Two separate things, and they are configured in different places.

### Dashboard

Razorpay Dashboard → Settings → API Keys. Copy the **live** key id and secret
into `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, then restart:

```sh
docker compose -f docker-compose.prod.yml up -d
```

> Use live keys only once the site is genuinely ready. Test keys produce
> `rzp_test_…` and the Razorpay checkout will work end to end, which makes it easy
> to forget to switch. `rzp_live_…` is the confirmation you actually went live.

### Webhook

Razorpay Dashboard → Settings → Webhooks → Add new webhook.

| Field | Value |
|---|---|
| URL | `https://pipelineprep.in/api/webhooks/razorpay` |
| Active | Yes |
| Events | `payment.captured`, `payment.failed`, `refund.processed`, `order.paid` |
| Secret | A strong random value |

Put the same secret in `RAZORPAY_WEBHOOK_SECRET`.

**What the webhook is for.** Premium is granted by the webhook handler, with a
signature-verified fallback if the webhook is delayed. There is no
auto-retry-friendly 5xx: the route deliberately returns `200` for events it
cannot act on so Razorpay does not retry forever, and an admin reconciles by
hand. So if the webhook is misconfigured, payments still succeed from the user's
point of view but Premium does not activate and nobody is told. After the first
real payment, verify the subscription actually landed in the database.

The signature is checked against the **raw** request body. Do not add a body
parser middleware in front of this route — it will break signature verification,
and the failure looks like "invalid signature" with nothing else wrong.

---

## 8. Google sign-in

Optional. Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` blank and the
"Continue with Google" button is not rendered at all — the app runs on email and
password exactly as before, with no half-enabled state.

To enable:

1. Google Cloud Console → create or select a project.
2. **APIs & Services** → **OAuth consent screen** → configure. The consent screen
   is Google's own; the only link shown comes from what you enter here.
3. **Credentials** → **Create credentials** → **OAuth client ID** → **Web
   application**.
4. Under **Authorised redirect URIs**, add exactly:

   ```
   https://pipelineprep.in/api/auth/google/callback
   ```

   Byte for byte. Scheme, host, port, no trailing slash. A mismatch fails at the
   token exchange with `redirect_uri_mismatch` — which is Google's error, not a
   bug in this app, and is by far the most common cause of a callback that
   "just fails".

5. Put the client id and secret in `.env.production` and restart.

Do not add `http://localhost:3000/...` to the production client unless you also
want local development to keep working with those same credentials.

The client secret is server-only. It travels in the authorisation-code exchange
and is never sent to the browser, so it does not need to be a public "client
secret" in the native-app sense.

---

## 9. Verify

Work through this list before telling anyone the site is live.

**Functional**

- [ ] `https://pipelineprep.in` loads, and HTTP redirects to HTTPS
- [ ] Sign up with a **real, unverified** address → confirmation email arrives
      within seconds. If it does not, you are in the SES sandbox.
- [ ] Click the confirmation link → it works, and a **second** click is refused
- [ ] The dashboard shows the confirmation banner when unconfirmed, and not when
      confirmed
- [ ] Practise a quiz — confirmation is not required for this, and it should not be
- [ ] Attempt to buy a plan while unconfirmed → blocked, with the reason shown
- [ ] Confirm the address, then buy a plan → Razorpay opens
- [ ] After paying, Premium is actually active on the dashboard, and the webhook
      logged a `payment.captured`
- [ ] Google sign-in completes and returns you to the page you started from
- [ ] Sign in with a Google-only account using a password → the message says to
      use Google rather than "incorrect password"
- [ ] `/admin` as a non-admin → redirected to `/dashboard`
- [ ] Dark and light themes both readable (spot-check `/`, `/pricing`, `/quizzes`)

**Configuration**

- [ ] `docker compose -f docker-compose.prod.yml exec app printenv AUTH_SECRET`
      returns a real value, not the dev fallback
- [ ] An invoice shows the GSTIN, the registered address and the 18% split
- [ ] `/refund` and `/privacy` show the registered address
- [ ] The test `razorpay.*` rows are gone from the `Setting` table
- [ ] The admin password has been changed

**Operations**

- [ ] RDS automated backup is enabled and the retention is what you expect
- [ ] Deletion protection is on
- [ ] A budget alarm exists
- [ ] A restorable snapshot has been taken and you know it restores

---

## Environment reference

Only the variables that differ from development, or that are mandatory in
production. Full annotated list in `.env.example`.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | Must be `production`. Enables `secure` cookies, and makes a missing `AUTH_SECRET` throw rather than fall back to a known dev key. |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://` origin, no trailing slash. Used for metadata, sitemap, OG tags, and every link in an email. |
| `DATABASE_URL` | yes | See [step 2](#2-rds-postgresql). |
| `AUTH_SECRET` | **yes** | The app throws on first request without it in production. One per environment; changing it signs everyone out. |
| `SMTP_*` | strongly recommended | Blank logs emails to stdout instead of sending them. Every confirmation, reset and invoice depends on this. |
| `EMAIL_FROM` | recommended | Use a domain you control and have verified in SES, or you will be in spam. |
| `RAZORPAY_KEY_ID` / `_SECRET` | for payments | Blank runs in "no gateway" mode: checkout shows a clear error rather than crashing, and an admin can grant Premium by hand. |
| `RAZORPAY_WEBHOOK_SECRET` | for payments | Without it the webhook rejects every event as invalid. |
| `GOOGLE_CLIENT_ID` / `_SECRET` | optional | Both blank → the button is not rendered. |
| `GOOGLE_REDIRECT_URI` | rarely | Defaults to `${NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`, which is correct unless a proxy rewrites the public host. |
| `BUSINESS_GSTIN` / `_ADDRESS` / `SUPPORT_PHONE` | **legally** | Omitted from invoices and legal pages when blank. See [blockers](#blockers-to-clear-first). |
| `GST_RATE` | yes | `18` for online education services in India. Keep the invoice maths consistent with your actual rate. |
| `CAREER_TOOLS_ENABLED` | optional | Environment wins over the database row. `false` also 404s the routes. |
| `CRON_SECRET` | recommended | Guards `POST /api/health`. Blank in production leaves that endpoint effectively unauthenticated. |

### One important detail

`NEXT_PUBLIC_*` variables are **inlined into the client bundle at build time**.
Changing `NEXT_PUBLIC_SITE_URL` therefore requires a rebuild, not just a
restart:

```sh
docker compose -f docker-compose.prod.yml up -d --build app
```

Every other variable is read at runtime and only needs a restart.

---

## Deploying an update

On the instance:

```sh
cd ~/app
scp -r src/ ubuntu@YOUR_EC2_IP:~/app/     # or git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```

For anything beyond a solo project, push to ECR and have the instance pull. It
keeps the build off a 2 GB instance and makes rollbacks a matter of changing a
tag:

```sh
aws ecr get-login-password | docker login --username AWS --password-stdin \
  YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com

docker build -t YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/pipelineprep:latest .
docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/pipelineprep:latest
```

### Migrations run automatically

`docker/entrypoint.sh` applies pending migrations on every boot before starting
the server, so a new migration ships with the code that needs it. It uses
`migrate deploy`, which applies pending migrations and nothing else.

**Migrations are not automatically reversible.** Review any migration that drops
or renames a column before deploying it — take a snapshot first, because the
rollback story for a destructive migration is "restore the snapshot", which means
losing everything written since.

### Zero-downtime, when you need it

`up -d` briefly stops the old container. On a single instance that is a short
outage. To avoid it later, run two containers behind Caddy and swap — or move to
ECS Fargate, which handles it natively. Not worth building for launch traffic.

---

## Rollback

There is no version control, so **take a snapshot of the source directory before
every deploy**:

```sh
cp -r ~/app ~/app.$(date +%Y%m%d-%H%M%S)
```

To roll back:

```sh
cd ~/app.previous
docker compose -f docker-compose.prod.yml up -d --build
```

If a migration has already run, roll the *database* back too:

```sh
aws rds create-db-snapshot \
  --db-instance-identifier pipelineprep-manual-$(date +%Y%m%d%H%M) \
  --db-snapshot-identifier pipelineprep

# point the app at the restored instance, or promote the snapshot in place
```

This is precisely why [git](#before-you-start) is step one. Restoring a
directory copy is not a rollback strategy; it is a mitigation for not having one.

---

## Backups

RDS automated backups with 7-day retention are the baseline. Add an explicit
snapshot before anything risky:

```sh
aws rds create-db-snapshot \
  --db-instance-identifier pipelineprep \
  --db-snapshot-identifier "pre-deploy-$(date +%Y%m%d-%H%M)"
```

**Restoring is the part people skip.** Do it once, deliberately, before you need
it. Restore into a second instance, point a temporary `DATABASE_URL` at it, and
confirm the question bank and a test login still work. An untested backup is a
hypothesis.

---

## Scheduled housekeeping

`POST /api/health` expires subscriptions that lapsed without a page view.
Entitlement is already evaluated on read, so a lapsed subscription loses access
immediately without any job — this only keeps reporting accurate.

Schedule it with EventBridge Scheduler calling a tiny Lambda, or a systemd timer
on the instance:

```
POST https://pipelineprep.in/api/health
Authorization: Bearer <CRON_SECRET>
```

Note the route only enforces the bearer token when `CRON_SECRET` is set. In
development that is deliberate convenience; in production it means an open
endpoint. Set it.

---

## When to move off a single instance

The instance going down takes the site down with it. Move when any of these
becomes true:

**EC2 → ECS Fargate.** You need the app to survive instance loss, or you want
rolling deploys with no downtime. The image needs no changes. Add an ALB in
front of Caddy, move secrets to Secrets Manager, and put env vars in the task
definition. Costs roughly $60/month more at low traffic.

**RDS → larger instance.** `db.t4g.small` handles a lot more than launch
traffic. Watch `DatabaseConnections` and CPU; `db.t4g.medium` is the next step
and the upgrade is a console click with a brief failover.

**Single-AZ RDS.** The first thing to enable if uptime starts to matter. It
roughly doubles the RDS cost.

**A real domain email provider.** SES is fine for transactional mail and is the
wrong tool for anything with deliverability requirements. If confirmation emails
start landing in spam, that is the signal to move, not the first one.

**Redis.** `docker-compose.yml` includes a Redis service but nothing in the
application uses it. Rate limiting is in-process and in-memory, so it resets on
every deploy and is per-instance. That is acceptable for abuse throttling on one
box; it is not acceptable across several. When you scale out, that is the first
thing to move to a shared store.

---

## Related

- `ARCHITECTURE.md` — why the app is built this way, and the constraints that
  shaped it
- `.env.example` — every variable, annotated
- `Dockerfile` / `docker/entrypoint.sh` — the image and the boot sequence
