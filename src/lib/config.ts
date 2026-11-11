const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("your_project") ||
    normalized.includes("your_supabase") ||
    normalized.includes("your-anon") ||
    normalized.includes("your_anon") ||
    normalized.includes("replace-me") ||
    normalized.includes("example")
  );
}

function usableUrl(value: string | undefined): value is string {
  if (!value || isPlaceholder(value)) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function usableAnonKey(value: string | undefined): value is string {
  if (!value || isPlaceholder(value)) return false;
  const key = value.trim();
  // Supabase anon keys are JWTs (eyJ...) or publishable keys (sb_publishable_...),
  // never URLs. The old check required "http", which rejected every real key
  // and forced the whole site into Demo Mode in production.
  return key.length >= 30 && !/^https?:\/\//i.test(key);
}

export const SUPABASE_URL = usableUrl(rawUrl) ? rawUrl.trim().replace(/\/$/, "") : "";
export const SUPABASE_ANON_KEY = usableAnonKey(rawKey) ? rawKey.trim() : "";
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Demo Mode is a local-development convenience only. It requires BOTH a dev
 * build and an explicit opt-in flag, so a production bundle can never silently
 * authenticate someone as a demo patron — even if the Supabase env vars are
 * missing.
 */
const demoRequested =
  (import.meta.env.VITE_ENABLE_DEMO_MODE as string | undefined) === "true";
export const IS_DEVELOPMENT = Boolean(import.meta.env.DEV);
export const DEMO_MODE = IS_DEVELOPMENT && demoRequested && !HAS_SUPABASE;

/** Non-empty when the build cannot authenticate users and demo mode is off. */
export const CONFIG_ERROR =
  !HAS_SUPABASE && !DEMO_MODE
    ? "Supabase authentication is not configured for this build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the hosting provider, then rebuild and redeploy."
    : "";

/* ----------------------------------------------------------------------------
 * Brand
 * ------------------------------------------------------------------------- */

export const BRAND_NAME = "Jerryhub";
export const BRAND_TITLE = "Jerryhub — Premium Anime Entertainment";
export const BRAND_DESCRIPTION =
  "Jerryhub is a premium anime entertainment club with uncensored 2K animation, interactive experiences, high-resolution art, 2D games and illustrated stories. Memberships start at $5.";

/* ----------------------------------------------------------------------------
 * Membership plans
 * ------------------------------------------------------------------------- */

export const BASIC_PRICE_LABEL = "$5";
export const FULL_PRICE_LABEL = "$9.50";
/** Kept for older imports: the entry-level price. */
export const PRICE_LABEL = BASIC_PRICE_LABEL;

export const BASIC_PLAN_NAME = "Basic Access";
export const FULL_PLAN_NAME = "Full Access";
export const BASIC_CTA_LABEL = "Get Started — From $5";
export const FULL_CTA_LABEL = "Get Full Access — $9.50";
export const UPGRADE_CTA_LABEL = "Upgrade to Full Access — $9.50";

/* ----------------------------------------------------------------------------
 * Patreon tier mapping
 * ----------------------------------------------------------------------------
 * Access is always derived from the verified Patreon entitled tier ids. The
 * mapping below is intentionally configurable so the $5 and $9.50 tiers can be
 * wired without ever trusting a displayed price or a client-side amount.
 * ------------------------------------------------------------------------- */

function tierList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((tier) => tier.trim())
    .filter(Boolean);
}

export const PATREON_BASIC_TIER_IDS = tierList(
  import.meta.env.VITE_PATREON_BASIC_TIER_ID as string | undefined,
);
export const PATREON_FULL_TIER_IDS = tierList(
  import.meta.env.VITE_PATREON_FULL_TIER_ID as string | undefined,
);
/** Legacy single-tier config. Only used when no two-tier mapping exists. */
export const PATREON_LEGACY_TIER_IDS = tierList(
  import.meta.env.VITE_PATREON_TIER_ID as string | undefined,
);
export const PATREON_TIER_MAPPING_CONFIGURED =
  PATREON_BASIC_TIER_IDS.length > 0 || PATREON_FULL_TIER_IDS.length > 0;
export const PATREON_TIER_IDS = [
  ...new Set([
    ...PATREON_BASIC_TIER_IDS,
    ...PATREON_FULL_TIER_IDS,
    ...PATREON_LEGACY_TIER_IDS,
  ]),
];

export const PATREON_PAGE_URL =
  (import.meta.env.VITE_PATREON_PAGE_URL as string | undefined)?.trim() ||
  "https://www.patreon.com/16612283/join";

export const ADMIN_EMAILS = ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const FUNCTION_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "";
