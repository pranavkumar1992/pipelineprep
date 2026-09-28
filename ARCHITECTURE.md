# Architecture notes

Working notes for things that are easy to get wrong later. Not a tutorial.

## Career Tools — reserved, not built

Three features are teased and have a waitlist, but **nothing is implemented**:

- `/career-tools/resume` — ATS-Friendly Resume Maker
- `/career-tools/jd-match` — Job Description Match
- `/career-tools/review` — AI Resume Review

All three are placeholder pages. There is no file upload, no document parsing, no
model call and no storage of resume content anywhere in the codebase. That is a
deliberate boundary, not a gap: the waitlist measures demand before the work is
built, and every surface that mentions these features says "Coming soon" or
"Join the waitlist".

### Feature flag

`CAREER_TOOLS_ENABLED`, or the `feature.career_tools_enabled` setting row. Both
are checked; the environment variable wins when set, so a deployment can force
the feature off regardless of what the database says. With the flag off:

- `/career-tools` and all three sub-routes return 404
- no teaser events are recorded
- the admin page explains how to switch it on

### What has to exist before launch

The placeholder routes are where the real implementations go. Each one needs:

1. **File upload with server-side limits.** Enforce a maximum size and a
   content-type allowlist in the action. Never trust the client-supplied MIME
   type or the file extension — both are attacker-controlled.

2. **Text extraction out of band.** Parsing a large PDF on the request path will
   time out the function. Run it in a job, and discard the original file once
   text is extracted. Do not keep the binary around.

3. **An LLM call with per-user limits.** Cap requests per user per day and cap
   tokens per request. Without both, one account can generate an unbounded bill
   in a single afternoon.

4. **Server-side premium gating.** Check entitlement inside the action, not only
   by hiding the link. A hidden button is not an access control; the endpoint
   stays callable directly.

5. **A retention and deletion policy.** Resumes are personal data. Decide and
   publish how long they are kept, how a user deletes them, and what happens to
   derived data on deletion — before storing any of it.

6. **Consent that matches reality.** The current copy is "We'll email you when
   this launches, and nothing else." If launch changes that — e.g. transactional
   mail about an in-progress review — the consent line has to change too.

## Theme

Two themes ship. The toggle writes `data-theme` to `<html>` and persists to
`localStorage`; an inline script in the document head applies the stored value
before first paint so there is no flash of the wrong theme.

Light mode works by remapping CSS variables, not by rewriting component classes.
Tailwind v4 compiles `text-white` to `var(--color-white)` and
`text-slate-400` to `var(--color-slate-400)`, so redefining those variables
under `[data-theme="light"]` re-themes every existing usage at once.

Two constraints make this fragile, so do not undo them:

1. **The remap must stay unlayered.** `@theme` emits its variables into the
   `theme` cascade layer, and layer order beats selector specificity. An earlier
   attempt put the remap inside `@layer base` and it silently did nothing,
   because `[data-theme="light"]` being more specific than `:root` does not help
   when the loser is in a lower layer.

2. **New colours need both ramps.** A colour added to `@theme` will only theme
   correctly if it also gets a light-mode value. Test both themes before
   shipping a new palette entry.

Contrast was verified by walking the rendered DOM and computing WCAG ratios
rather than by eye. If you change the ramps, re-run that check.

### Verifying contrast

An audit that parses colours with an `rgb()` regex is worthless here. Tailwind
v4 emits `oklab()` and CIE `lab()` for most of the dark palette, and `lab()` is
not accepted by canvas `fillStyle` either. A regex-only audit therefore skips
most of the dark theme and reports a clean bill of health for elements it never
looked at — which is exactly what happened the first time this was checked, when
a real set of failures was reported as zero.

To do it properly:

1. Convert `lab(L a b)` to sRGB by hand (D65 white point, sRGB matrix, gamma).
   `oklab()` can go through `ctx.fillStyle`.
2. Walk up for the first ancestor with a near-opaque background.
3. Set the theme via `localStorage` **before** navigating, so the page boots in
   the right theme the way a returning visitor sees it. Setting `data-theme`
   after load works for CSS but not for anything the theme script already ran.
4. Skip `aria-hidden="true"` subtrees. Breadcrumb separators are decorative and
   exempt from 1.4.3; including them buries the real failures.

Current state: 0 failures across 12 pages × 2 themes.

## Google sign-in

Optional. With `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` both blank,
`env.googleEnabled` is false, the "Continue with Google" button is not rendered
at all, and the app behaves exactly as it did before — email and password only.
Nothing else changes; there is no partially-enabled state.

Implementation is the authorisation-code flow in `src/lib/auth/google.ts`, done
directly rather than through a provider library: one redirect, one token
exchange, one userinfo call. See the file header for why.

### Schema

- `User.passwordHash` is **nullable**. A Google-only account has no password, and
  a `NOT NULL` column makes that unrepresentable. The login path treats NULL as
  "password sign-in unavailable for this account", not as a failed bcrypt
  comparison — the dummy-hash timing equalisation still runs either way, so a
  NULL account is indistinguishable in timing from a wrong password.
- `User.emailVerifiedVia` records that Google asserted ownership. Google's
  assertion is stronger than our own emailed link, so those accounts skip the
  verification nag.
- `OAuthAccount` is keyed on a unique `(provider, providerAccountId)`. That
  index is what guarantees one Google login maps to exactly one account, so the
  same Google identity cannot be re-linked onto a different user.
- `provider` is a `String`, not a Prisma enum. Adding a provider should be a
  data change, not a table-locking migration.
- Identity is keyed on Google's stable `sub`, never on email. Emails change;
  the id does not.

### Account linking

`src/lib/auth/google-link.ts` has three outcomes, in order of safety:

1. The Google identity is already linked → sign in.
2. No account for that email → create one, pre-verified.
3. An account exists for that email **and has a password** → refuse, send them
   to password sign-in.

Case 3 is the one worth arguing about. Auto-linking would be convenient, but it
turns "someone knows your email address" into "someone can take over the
account". Merging is not a fallback either: a merge could hand over attempts,
progress and an active subscription, so that needs a deliberate, separate flow
with its own confirmation. A passwordless account *is* linked automatically —
there is no password to escalate into.

### Setup

Register the redirect URI in Google Cloud Console, exactly:

```
http://localhost:3000/api/auth/google/callback
https://YOUR-DOMAIN/api/auth/google/callback
```

Byte for byte, including scheme, host, port and no trailing slash. A mismatch
fails at the token exchange with `redirect_uri_mismatch`, which is Google's
error, not a bug here.

The client secret is server-only. It travels in the authorisation-code exchange
and is never sent to the browser, so it is not a public "client secret" in the
native-app sense.

The `state` parameter is a 10-minute signed JWT carrying the post-login
destination. The callback treats an unverifiable state as a total failure rather
than falling back to a default, because a fallback silently drops CSRF
protection. `next` is validated as a same-origin relative path in both the
initiate route and the action, so it cannot be used as an open redirect.

### Not built

- No account linking flow for a signed-in user whose Google email matches a
  password account. They get the "sign in with your password, then link" message
  and the link is available from settings for the reverse direction.
- No refresh tokens. Sessions are 30-day JWTs; there is no offline access, so
  there is nothing to refresh. Adding `access_type=offline` would mean storing
  and rotating refresh tokens, which is a larger change than it looks.
- No second provider. `provider` is a string so the data model allows one, but
  nothing in the code is provider-agnostic yet.

## Email confirmation

`emailVerified` gates **checkout only**. Signing in and practising are never
gated.

That split is deliberate. Gating sign-in would lock someone out of content they
can legitimately see and punish them for an email delivery problem. Gating
checkout is proportionate: money is involved, and an unconfirmed address is
exactly what payment-account-takeover attempts rely on. The gate is enforced
server-side in `startCheckoutAction`, and mirrored in the UI on the pricing page
so the requirement is visible before the user fills in a form.

- The dashboard banner explains what confirmation is *for* rather than nagging in
  the abstract, and offers a resend. It renders nothing once confirmed.
- Resend is rate-limited twice — per IP so one person cannot enumerate addresses,
  per user so a shared NAT does not exhaust the quota on their behalf. The
  response is identical whether the address was already confirmed, so the button
  cannot be used to discover which addresses are registered.
- Issuing a token invalidates any earlier unused one, so only the newest link in
  the inbox works. Without that, a forwarded old link stays valid.
- `/verify-email` renders a form and submits on click rather than consuming the
  token during server render. Consuming during render means a refresh attempts
  to reuse a spent token and reports failure for a link that worked.
- Signup is still never blocked on email delivery. The welcome email carries the
  confirmation link; a send failure is logged and the account exists anyway.
- Admins are treated as verified. Premium is granted by hand as a support action
  on accounts that frequently cannot receive mail.

### Middleware interaction

`loginRedirect` carries the query string as well as the path:
`/login?next=%2Fverify-email%3Ftoken%3D…`. Without that, a signed-out user
following a confirmation link lands on `/verify-email` with the token stripped
out of the URL, so signing in would take them to a page that can no longer do
anything.

## Payments

Settings resolve **environment first, then the database**, so a deployment that
pins credentials cannot be silently overridden from the admin UI. The admin
panel shows which source each credential is actually using, because a value
that saves but has no effect is the failure mode worth designing against.

`getRazorpay()` caches clients by key pair rather than in a module-level
singleton, so changing credentials in the admin panel takes effect without
restarting the process.

A "lifetime" plan is `Plan.lifetime = true` with `durationDays = 0`. Before the
lifetime flag existed, `durationDays = 0` meant "free tier", so the two states
were indistinguishable. Lifetime resolves to a sentinel `LIFETIME_EXPIRY` date
because `Subscription.expiresAt` is non-nullable and entitlement is evaluated by
comparing it to now.

## Route gating

`src/middleware.ts` redirects unauthenticated requests before rendering begins.
The server components still call `requireUser` / `requireAdmin`, but a
`redirect()` thrown during a streamed render serves the target page's content at
the original URL — a visitor ends up looking at a login form while the address
bar still says `/quizzes`.

To check gating from a shell, use `curl` and read the status line:

```sh
curl -s -o NUL -D - --max-redirs 0 http://localhost:3000/quizzes
# expect: 307 and location: /login?next=%2Fquizzes
```

Do not verify with `fetch()` in a script — it follows redirects by default, so
you end up reading the final response and concluding the gate does not exist.

### The auth screens are not gated here

The middleware used to bounce a signed-in visitor away from `/login`. It no
longer does, and it must not be put back.

The middleware runs on the edge and cannot query the database, so all it can
establish is that a token's signature is valid — not that the account still
exists. A cookie that outlives its user, which is exactly what
`deleteAccountAction` leaves behind (the token is valid for 30 days), therefore
looks signed in forever:

```
/dashboard -> page redirects to /login -> middleware bounces to /dashboard -> ...
```

The browser gives up with `ERR_TOO_MANY_REDIRECTS` and the visitor is stuck on an
error page with no way to sign in. The loop is unbreakable from the middleware
side.

The pages call `redirectIfSignedIn()` instead, which resolves the session against
the database first. `getSession` now loads the user row rather than trusting the
token claims alone, for the same reason. One indexed primary-key lookup per
request, deduplicated by React `cache`.

`/reset-password` deliberately renders for a signed-in user rather than
redirecting. A reset link proves email ownership, and refusing to honour one
because the visitor is already logged in is a footgun.

## Content pipeline

Questions are authored as CSV in `prisma/seed-data/content-volume.ts`, converted
once to JSON by `scripts/convert-content.ts`, then upserted by
`prisma/seed-content.ts` and redistributed into level banks by
`prisma/seed-banks.ts`.

Every step is idempotent. Questions are keyed on `(topicId, text)`, so re-running
the pipeline updates rather than duplicates, and a bank can be rebuilt from
scratch at any time.

Bank distribution is round-robin across levels, not difficulty-to-level mapping.
Mapping by difficulty left the Advanced banks nearly empty, because authored
questions cluster at medium.

## Deliberate omissions

Things that are absent on purpose. Do not add them without a decision.

- **Light/dark onboarding, system theme detection.** Dark is the default;
  `prefers-color-scheme` is not consulted. Adding it changes first-paint for
  every returning user.
- **A public quiz detail route.** Individual banks are per-user (progress and
  locks), so they are deliberately excluded from the sitemap rather than listed
  and then redirecting to sign-in.
- **Resume upload and AI review.** See the Career Tools section above.
- **Account merging.** Refusing to auto-link is a decision, not an omission. If
  it is ever reversed, a merge has to move attempts, bookmarks, progress and
  subscription state deliberately, and confirm with the existing credential
  first. See the Google sign-in section.
- **Forcing email confirmation on sign-in.** Verified as wrong: it locks people
  out of content on a delivery problem.

## Deployment

Full launch procedure in **`docs/AWS-DEPLOY.md`**. Single EC2 + Docker Compose +
RDS, with Caddy terminating TLS. Supporting files:

| File | Role |
|---|---|
| `Dockerfile` | Multi-stage build producing a standalone Next.js image |
| `docker/entrypoint.sh` | Waits for the DB, applies migrations, seeds if empty, starts the server |
| `docker-compose.prod.yml` | App + Caddy. App port is *not* published; only Caddy binds 80/443 |
| `Caddyfile` | Automatic certificate issuance and renewal |
| `.env.production` | Secrets, on the instance only, `chmod 600` |

Four things the image depends on that are easy to break from the outside, all of
which have already happened at least once:

1. **`output: "standalone"` in `next.config.ts`.** The final stage copies
   `.next/standalone`. Without it the build fails at that `COPY` — and a local
   `next build` still succeeds, so the breakage only appears in Docker.
2. **`public/` must exist**, even nearly empty. A `COPY` from a stage fails
   outright when the source path is absent.
3. **`prisma/migrations` must not be in `.dockerignore`.** `prisma migrate
   deploy` reads the SQL from disk rather than from the generated client, so
   excluding them yields an image that starts happily and then leaves the
   production schema empty.
4. **`prisma.config.ts` must be copied into the runtime image.** Prisma 7
   resolves the schema path and the datasource URL from that root config; the
   schema itself declares no `url`.

`.env*` is gitignored with `!.env.example` re-included. Ignore the family rather
than listing files, so a new secrets file cannot be committed by accident on the
first `git add -A`.
