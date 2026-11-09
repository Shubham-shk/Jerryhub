const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function usable(value: string | undefined): value is string {
  return Boolean(
    value &&
      value.trim() &&
      !value.includes("YOUR_PROJECT") &&
      !value.includes("YOUR_SUPABASE") &&
      value.startsWith("http"),
  );
}

export const SUPABASE_URL = usable(rawUrl) ? rawUrl.replace(/\/$/, "") : "";
export const SUPABASE_ANON_KEY = usable(rawKey) ? rawKey : "";
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const DEMO_MODE = !HAS_SUPABASE;

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
  "https://www.patreon.com";

export const ADMIN_EMAILS = ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const FUNCTION_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "";
