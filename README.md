# Jerryhub

A cinematic, glassmorphism premium anime entertainment club with **two Patreon membership levels**:

| Plan | Price | Access |
| --- | --- | --- |
| **Basic Access** | **$5/month** | Entry-level premium collection and Basic member-exclusive content |
| **Full Access** | **$9.50/month** | Everything in Basic plus all available premium content |

Built with React + Vite + TypeScript, Supabase, and Patreon OAuth 2.0.

> **Adults only.** The app opens with an age gate before any other interaction. Premium files are stored in a private bucket and are never exposed to a browser until Supabase has verified the member's current Patreon entitlement server-side.

---

## What is included

- **Age gate first** — blocks the site until the visitor confirms they are 18+, with consent stored in `localStorage`. Legal pages remain readable so terms are always accessible.
- **Conversion-focused landing page** — mixed-aspect-ratio hero slideshow, two-tier membership cards, feature grid, how-it-works, full FAQ accordion, and legal footer.
- **Cinematic glass UI** — frosted panels, neon pink/violet glows, staggered scroll reveals, and smooth scale/glow hover states.
- **Four curated collections + mixed trending** — Trending Now, Newest Uploads, NSFW Arts & Videos, 2D Games, and Manga + Comics, all using the same numbered poster carousel.
- **Sharp public thumbnails** — posters are fully visible to visitors; there are no lock icons, blur, or gating overlays. Membership is checked when a card is opened.
- **Patreon login everywhere** — nav, hero, pricing section, account page, auth prompt, and entitlement prompts.
- **Basic and Full library access** — each media set has an `access_level` of `public`, `basic`, or `full`. Full includes every Basic benefit; Basic never opens Full-only releases.
- **Accessible upgrade path** — Basic members see an **Upgrade to Full Access — $9.50** prompt only when they open Full-only content.
- **Custom player** — video player, image lightbox/gallery, embedded PDF viewer, and funscript download.
- **Downloads for entitled members** — signed URLs minted on demand by an Edge Function after a fresh tier check.
- **Account page** — Patreon status, verified access level, entitled tier IDs, pledge, last verification, manage/update links, and logout.
- **Real-time membership updates** — Patreon webhooks update `profiles`; Supabase Realtime pushes the change into the UI.
- **Admin dashboard** — create media sets, choose a homepage collection, set Public/Basic/Full access, upload thumbnails and premium files, recategorise sets, toggle trending/new, delete sets/files, view members and their verified tier IDs, change entitlements, review membership changes, and inspect the Patreon tier mapping.
- **Demo Mode** — with no Supabase environment variables, the whole UI runs with local sample media and a demo member that can be switched between Basic, Full, and inactive.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, TypeScript, React Router, lucide-react |
| Styling | Hand-written CSS with mobile-first breakpoints |
| Auth / DB / Storage | Supabase Auth, Postgres, Storage, Realtime |
| Patreon | OAuth 2.0 Authorization Code flow, API v2, webhooks |
| Server logic | Supabase Edge Functions (Deno) |
| Hosting | Vercel |

---

## Quick start (Demo Mode)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

With no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, the app uses:

- a local demo member (active, admin, Full Access by default),
- 24 generated portrait posters in `public/posters`,
- 4 generated cinematic banners in `public/banners` at mixed aspect ratios,
- local MP4, PDF, and funscript files in `public/demo`.

Use **Log in with Patreon** to enter the demo member, then open any card. The Account page has demo controls to switch between **Basic Access**, **Full Access**, and **Inactive**.

> Demo Mode is for UI development only. It does not exercise Patreon OAuth, RLS, storage policies, or signed URLs.

---

## Production setup

### 1. Create and link a Supabase project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies the migrations in order:

1. `supabase/migrations/20261104000000_init.sql` — core schema and access control.
2. `supabase/migrations/20261104010000_content_categories.sql` — adds `media_sets.category` (`animation`, `arts`, `games`, `comics`).
3. `supabase/migrations/20261109000000_membership_tiers.sql` — adds `media_sets.access_level` (`public`, `basic`, `full`, default `full`) and the optional `membership_events` audit table.

The initial migration creates:

- `profiles`, `media_sets`, and `media_assets`,
- the `updated_at`, new-user profile, and `asset_count` triggers,
- `is_active_patron()` / `is_admin()` helpers,
- RLS policies and grants,
- public `thumbnails` and private `premium` storage buckets,
- storage policies that allow admins to upload and **nobody** to select premium objects directly,
- the `profiles` Realtime publication entry.

`primary_type` controls how a set is opened (video player, gallery, PDF reader, funscript download). `category` decides which homepage collection the set appears in. `access_level` decides which membership level can open it.

```sql
-- Example: make a set available to Basic Access and above
update public.media_sets set access_level = 'basic' where slug = 'the-art-of-seduction';

-- Example: restrict a set to Full Access
update public.media_sets set access_level = 'full' where slug = 'midnight-velvet';
```

### 2. Create a Patreon OAuth client

In the [Patreon Clients & API Keys portal](https://www.patreon.com/portal/registration/register-clients):

1. Create a **v2** client.
2. Add this exact redirect URI:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/patreon-oauth?action=callback
   ```

3. Make sure the client can request these scopes:

   ```text
   identity
   identity[email]
   identity.memberships
   ```

The Edge Function requests them during login. It only needs to read the signed-in user's identity and memberships.

Find your **campaign id** and the **tier ids** for the $5 and $9.50 tiers with your creator access token:

```bash
curl -s \
  -H "Authorization: Bearer YOUR_CREATOR_ACCESS_TOKEN" \
  "https://www.patreon.com/api/oauth2/v2/campaigns?fields%5Bcampaign%5D=vanity,creation_name&include=tiers&fields%5Btier%5D=title,amount_cents"
```

- The campaign id is the `data[].id`.
- Each tier id is in `included[]` where `type` is `tier` and the title/amount matches the tier.
- **Map the $5 tier to Basic and the $9.50 tier to Full.** Do not infer access from the displayed price.

### 3. Configure Patreon webhooks

Open the [Patreon Webhooks portal](https://www.patreon.com/portal/registration/register-webhooks) while signed in as the campaign creator, then create a webhook:

- **URI:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/patreon-webhook`
- **Triggers:** `members:create`, `members:update`, `members:delete`, `members:pledge:create`, `members:pledge:update`, `members:pledge:delete`
- Copy the generated **secret** into `PATREON_WEBHOOK_SECRET`.

The function verifies Patreon's `X-Patreon-Signature` (HMAC-MD5) before changing anything. When a member's status or tier changes, it also appends a row to `membership_events`.

### 4. Set Edge Function secrets

```bash
supabase secrets set \
  APP_URL=https://your-domain.com \
  PATREON_CLIENT_ID=... \
  PATREON_CLIENT_SECRET=... \
  PATREON_CAMPAIGN_ID=... \
  PATREON_BASIC_TIER_ID=... \
  PATREON_FULL_TIER_ID=... \
  PATREON_REQUIRED_AMOUNT_CENTS=500 \
  PATREON_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/patreon-oauth?action=callback" \
  PATREON_STATE_SECRET="$(openssl rand -hex 32)" \
  PATREON_WEBHOOK_SECRET=...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase's Edge runtime. Do not put the service role key in Vite or commit it.

**Tier mapping rules:**

- `PATREON_BASIC_TIER_ID` — comma-separated tier IDs that grant Basic Access.
- `PATREON_FULL_TIER_ID` — comma-separated tier IDs that grant Full Access.
- `PATREON_TIER_ID` — legacy fallback. Only used when neither two-tier variable is set; active members mapped through it receive Full Access for backwards compatibility.
- If two-tier mapping is configured, an unmatched tier resolves to **Public** — never silently to Full.
- `PATREON_REQUIRED_AMOUNT_CENTS` is only a final fallback when no tier IDs are configured. The default is `500`.

### 5. Deploy the Edge Functions

```bash
supabase functions deploy patreon-oauth
supabase functions deploy patreon-webhook
supabase functions deploy media-signed-url
```

`supabase/config.toml` disables the platform JWT check for these functions because they either handle Patreon redirects/webhooks or verify the caller's JWT themselves. The signed-URL function still rejects missing/expired sessions and re-checks the member's verified access level before signing anything.

### 6. Configure Supabase Auth

In **Authentication → Providers / Settings**:

- Set **Site URL** to `https://your-domain.com`.
- Disable public email sign-ups and anonymous sign-ins. Accounts are created by the Patreon OAuth Edge Function with the service role.
- Optionally add `https://your-domain.com/**` to the redirect allow-list. The Patreon flow uses a `token_hash` + `verifyOtp`, not a Supabase email redirect, so no email is sent to users.
- Keep email confirmations enabled; the Edge Function creates already-confirmed users.

### 7. Deploy the frontend to Vercel

1. Import the repository into Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add these environment variables:

   ```text
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   VITE_PATREON_BASIC_TIER_ID=YOUR_BASIC_TIER_ID
   VITE_PATREON_FULL_TIER_ID=YOUR_FULL_TIER_ID
   VITE_PATREON_PAGE_URL=https://www.patreon.com/YOUR_CAMPAIGN
   VITE_ADMIN_EMAILS=you@example.com
   ```

`vercel.json` already rewrites all routes to `index.html` for client-side routing and sets basic security headers.

`VITE_ADMIN_EMAILS` only reveals the admin link in the UI. **Real admin rights come from `public.profiles.is_admin`.** Never rely on an email string in the browser for authorization.

### 8. Make yourself an admin

1. Sign in once through Patreon.
2. In the Supabase SQL editor:

   ```sql
   update public.profiles
   set is_admin = true
   where email = 'you@example.com';
   ```

3. Refresh the site. The Account page will show the Admin dashboard link.

### 9. Upload the first media set

Open `/admin` and:

1. Create a set with a title, description, **homepage collection**, **access level**, portrait thumbnail, primary type, and optional duration.
2. Upload one or more premium files to the private `premium` bucket.
3. Toggle **Trending** / **New** as desired.
4. Verify the set appears in the correct homepage row and the access label matches its intended audience.

Thumbnails should be **2:3 portrait** images (for example 1200 × 1800). The card crops with `object-fit: cover`, so keep the subject centred. The admin table's **Collection** dropdown moves a set between Newest Uploads, NSFW Arts & Videos, 2D Games, and Manga + Comics. The **Access** dropdown sets Public, Basic Access, or Full Access.

---

## Access-control architecture

```text
Visitor
  │
  ├─ media_sets (public RLS read of published rows)
  │     └─ thumbnail_path → public "thumbnails" bucket
  │
  └─ Patreon login
        │
        ├─ patreon-oauth Edge Function
        │     ├─ validates signed OAuth state (HMAC-SHA256, 15 min)
        │     ├─ exchanges code with Patreon
        │     ├─ fetches identity + memberships
        │     ├─ verifies campaign, patron status and entitled tier IDs
        │     ├─ resolves Basic vs Full from secure tier mapping
        │     ├─ creates/updates auth user + profiles row
        │     └─ generates a Supabase magic-link token_hash
        │
        └─ /auth/callback?token_hash=...
              └─ supabase.auth.verifyOtp() → authenticated session

Entitled member
  │
  ├─ media_assets RLS select (only if is_active_patron())
  │
  └─ media-signed-url Edge Function
        ├─ verifies Supabase JWT
        ├─ re-reads profile membership + verified tier IDs
        ├─ resolves Basic vs Full access
        ├─ reads the set's access_level
        ├─ rejects Basic members opening Full-only sets
        └─ service-role createSignedUrl() on the private "premium" bucket
```

### What is protected where

| Control | Enforcement |
| --- | --- |
| Age gate | First interaction in the React shell; consent stored locally. Legal pages (`/legal/*`) stay readable before consent. |
| Public card data | `media_sets` RLS: published rows only |
| Thumbnails | Public `thumbnails` bucket |
| Premium file metadata | `media_assets` RLS: active members/admins only |
| Premium bytes | Private `premium` bucket, **no client select policy** |
| File URLs | `media-signed-url` re-checks membership and per-set access level, returns 1-hour signed URLs |
| Downloads | Same Edge Function, only with `download: true` after the entitlement check |
| Admin writes | RLS `is_admin()` + storage policies |
| Profile membership fields | Service-role-only writes; trigger blocks user self-escalation |
| Patreon webhook authenticity | HMAC-MD5 signature check against raw body |

### Why premium URLs cannot leak before verification

1. `media_assets` rows are not readable by anonymous users.
2. The `premium` bucket has no `select` policy for `anon` or `authenticated`.
3. Only the Edge Function's service-role client can call `createSignedUrl`.
4. The function verifies the JWT, membership status, campaign, tier and per-set access level on every request.
5. Signed URLs expire after one hour, so a copied URL is not a permanent key.

This is still not DRM. A verified member can download a file and share it. Short-lived URLs and access checks reduce casual leakage; they do not prevent a determined user from saving content. If that matters, add per-user forensic watermarking and a DMCA/takedown workflow.

---

## Local development with real Supabase

Demo Mode is the fastest way to work on the UI. To exercise the backend locally:

1. Create `.env.local` from `.env.example` and fill in the Vite values.
2. Link the Supabase project and push the migrations.
3. Deploy the functions to your Supabase project (Patreon cannot redirect to a local function URL reliably).
4. Set `APP_URL=http://localhost:5173` and the deployed function redirect URI for local testing.
5. Run:

   ```bash
   npm run dev
   ```

If you need to run functions locally, use `supabase functions serve` and point `PATREON_REDIRECT_URI` at the local function URL. Patreon requires HTTPS for registered redirect URIs, so a tunnel such as ngrok/Cloudflare Tunnel is usually needed for a complete local OAuth test.

---

## Testing checklist

- [ ] Fresh visit shows the age gate before anything else.
- [ ] Declining the age gate keeps the site blocked.
- [ ] Accepting stores consent and shows the landing page.
- [ ] Browser title is **Jerryhub — Premium Anime Entertainment**.
- [ ] Homepage, nav, footer, legal pages, login, dashboard, and FAQ all say **Jerryhub**.
- [ ] Pricing shows **Get Access Starting From $5**, Basic Access $5, and Full Access $9.50.
- [ ] No old messaging such as “Get Everything for $5” or “All Access for $5” remains.
- [ ] No lock icons appear anywhere in the UI.
- [ ] Anonymous cards are sharp, portrait, numbered, and show no lock or blur overlay.
- [ ] Clicking a card as an anonymous visitor opens the Patreon login prompt, not the player.
- [ ] Homepage sections appear in order: Hero, Trending Now, Newest Uploads, NSFW Arts & Videos, 2D Games, Manga + Comics.
- [ ] Trending mixes animation, arts, games, and comics.
- [ ] Carousels overflow and the right arrow scrolls the row.
- [ ] Hero slideshow cycles mixed-ratio banners and pauses on hover.
- [ ] Logging in as an active member redirects to `/account` (or the saved post-login path).
- [ ] Basic member can open Basic and Public sets but not Full-only sets.
- [ ] Full member can open Basic, Public, and Full sets.
- [ ] Basic member sees **Upgrade to Full Access — $9.50** only on Full-only content.
- [ ] Video, image gallery, PDF, and funscript assets all load for entitled content.
- [ ] Download buttons only appear/work for entitled members.
- [ ] Inactive member sees: “Your Patreon membership is inactive. Update your pledge to regain access.”
- [ ] Directly opening a `premium` object URL without a signature fails.
- [ ] Calling `media-signed-url` without a JWT returns `401`.
- [ ] Calling `media-signed-url` with an inactive member JWT returns `403`.
- [ ] Calling `media-signed-url` as a Basic member for a Full-only set returns `403`.
- [ ] A Patreon webhook cancellation changes the UI without a full reload.
- [ ] A tier change updates the member's access level after verification.
- [ ] Admin can create a set, choose Public/Basic/Full, upload files, toggle flags, and delete files.
- [ ] Admin can view Basic/Full members, their status, and associated Patreon tier IDs.
- [ ] Admin can change a member's entitlement and review membership changes.
- [ ] Admin sees the configured Basic/Full tier mapping (or a warning when it is missing).
- [ ] The layout works at ~390 px, 768 px, and desktop widths.

Useful manual checks:

```bash
# Should fail: no client select policy on the private bucket
curl -i "https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/premium/sets/example.mp4"

# Should return 401 without a token
curl -i -X POST \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/media-signed-url" \
  -H "Content-Type: application/json" \
  -d '{"assetId":"00000000-0000-0000-0000-000000000000"}'
```

---

## Project structure

```text
.
├─ public/
│  ├─ banners/               # Mixed-ratio cinematic hero banners
│  ├─ demo/                  # Local demo MP4, PDF, funscript
│  ├─ posters/               # portrait-*.svg posters (+ legacy 16:9 art)
│  ├─ favicon.svg            # Jerryhub J monogram
│  ├─ manifest.webmanifest   # PWA metadata
│  └─ og-image.svg           # Social share image
├─ scripts/
│  ├─ generate-cinematic-art.mjs  # 24 portrait posters + 4 banners
│  ├─ generate-demo-assets.mjs
│  └─ generate-posters.mjs
├─ src/
│  ├─ components/            # Nav, numbered poster cards, carousel, player, age gate
│  │  └─ landing/            # Hero slideshow, access strip, pricing, features, FAQ, CTA
│  ├─ context/               # Auth, age gate, UI/toast state
│  ├─ data/                  # FAQ + 24 demo media sets across four categories
│  ├─ hooks/                 # Media fetching, document title, open-media, scroll reveal
│  ├─ lib/                   # Supabase client, API helpers, types, config, access rules
│  ├─ pages/                 # Landing, browse, account, admin, auth callback, legal
│  └─ styles/                # Base, layout, landing, player, admin, responsive, glass
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 20261104000000_init.sql
│  │  ├─ 20261104010000_content_categories.sql
│  │  └─ 20261109000000_membership_tiers.sql
│  └─ functions/
│     ├─ _shared/            # HTTP/CORS, Patreon API, profile sync, admin client
│     ├─ patreon-oauth/
│     ├─ patreon-webhook/
│     └─ media-signed-url/
├─ .env.example
├─ vercel.json
└─ README.md
```

---

## Environment variables

### Frontend (Vite — public)

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_PATREON_BASIC_TIER_ID` | Patreon tier ID(s) mapped to Basic Access; comma-separated |
| `VITE_PATREON_FULL_TIER_ID` | Patreon tier ID(s) mapped to Full Access; comma-separated |
| `VITE_PATREON_TIER_ID` | Legacy single-tier fallback (Full Access) |
| `VITE_PATREON_PAGE_URL` | Campaign/pledge URL used by CTAs |
| `VITE_ADMIN_EMAILS` | Cosmetic admin-link hint only |

If the Supabase URL/key are absent, the app runs in Demo Mode.

### Edge Functions (server secrets)

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Exact frontend origin; used to validate OAuth return URLs |
| `PATREON_CLIENT_ID` | Patreon OAuth client id |
| `PATREON_CLIENT_SECRET` | Patreon OAuth client secret |
| `PATREON_CAMPAIGN_ID` | Campaign id used for membership matching |
| `PATREON_BASIC_TIER_ID` | Entitled tier id(s) mapped to Basic Access |
| `PATREON_FULL_TIER_ID` | Entitled tier id(s) mapped to Full Access |
| `PATREON_TIER_ID` | Legacy single-tier fallback (Full Access) |
| `PATREON_REQUIRED_AMOUNT_CENTS` | Final fallback minimum pledge when no tier ID is set |
| `PATREON_REDIRECT_URI` | Exact registered OAuth callback URL |
| `PATREON_STATE_SECRET` | Long random secret for OAuth state HMACs (32+ chars) |
| `PATREON_WEBHOOK_SECRET` | Patreon webhook signing secret |
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_ANON_KEY` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected; never expose to the browser |

---

## Security notes

- **Never expose the Supabase service role key.** It is used only in Edge Functions.
- **Do not rely on frontend checks.** RLS and the signed-URL function are the real gates.
- **Tier IDs, not prices.** Access is resolved from verified Patreon entitled tier IDs. Displayed prices, user input, frontend state, and payment amounts are never trusted.
- **Previous tiers do not persist access.** Every request recalculates access from the current verified entitlement.
- **Rotate secrets** if a client secret, state secret, or webhook secret is exposed.
- **Patreon OAuth state** is signed with HMAC-SHA256 and expires after 15 minutes, preventing CSRF/open-redirect abuse.
- **Return URLs** are restricted to the origin in `APP_URL`.
- **Webhook bodies** are verified against `X-Patreon-Signature` using the raw body bytes before parsing.
- **Profile self-escalation** is blocked by `protect_profile_columns()`; only service-role/trusted sessions can change membership or admin flags.
- **Signed URLs** are short-lived (one hour) and minted per request. The premium bucket has no direct client read policy.
- **Age gate** is a consent mechanism, not age verification. If legal requirements demand verified age assurance, integrate a dedicated age-verification provider.
- **Content and legal pages** are templates. Review the Terms, Privacy, DMCA, and Contact pages with a lawyer for your jurisdiction and payment processor requirements.

---

## Troubleshooting

### “Patreon sign-in is temporarily unavailable”

Check the `patreon-oauth` function logs. Common causes:

- missing `APP_URL`, `PATREON_CLIENT_ID`, `PATREON_CLIENT_SECRET`, or `PATREON_STATE_SECRET`;
- the redirect URI in Patreon does not exactly match `PATREON_REDIRECT_URI`;
- the OAuth client is not a v2 client or lacks the identity scopes.

### Login succeeds but the account stays locked

- Confirm `PATREON_CAMPAIGN_ID` matches the campaign returned by Patreon.
- Confirm `PATREON_BASIC_TIER_ID` and `PATREON_FULL_TIER_ID` contain real tier IDs, not tier titles or amounts.
- Check `profiles.membership_status`, `entitled_tier_ids`, and `pledge_amount_cents` in Supabase.
- Remember the frontend also checks `VITE_PATREON_BASIC_TIER_ID` / `VITE_PATREON_FULL_TIER_ID`; they must contain the same tier IDs.

### A Basic member can open Full-only content

- Confirm the set's `access_level` is `full`.
- Confirm the server has `PATREON_BASIC_TIER_ID` and `PATREON_FULL_TIER_ID` set.
- Re-check the member's `entitled_tier_ids`; an old Full tier ID must not remain after a downgrade.
- Call `media-signed-url` directly as that member; it should return `403` for Full-only assets.

### Webhook returns 401

- `PATREON_WEBHOOK_SECRET` must be the exact secret shown on the Patreon webhook.
- The function verifies the raw request body. Do not add a body-parsing proxy in front of it.

### Premium uploads fail

- The user must have `profiles.is_admin = true` and a fresh session.
- The `premium` bucket must exist (the migration creates it).
- Free-plan projects may have a storage/file-size limit below the 5 GB bucket setting.

### The admin link is missing

- `VITE_ADMIN_EMAILS` is only a hint.
- Set `profiles.is_admin = true` and refresh the profile/session.

---

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # TypeScript build + production bundle
npm run preview    # Preview the production build
npm run typecheck  # TypeScript only
npm run posters    # Regenerate the legacy 16:9 demo posters
npm run art        # Regenerate 24 portrait posters + 4 cinematic banners
```

---

## License / content

This repository is a template for a private, Patreon-gated media portal. You are responsible for the legality of the content you upload, the accuracy of your age gate and legal pages, and compliance with Patreon's terms, payment-processor rules, and applicable adult-content laws.
