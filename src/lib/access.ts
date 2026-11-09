import {
  PATREON_BASIC_TIER_IDS,
  PATREON_FULL_TIER_IDS,
  PATREON_LEGACY_TIER_IDS,
  PATREON_TIER_MAPPING_CONFIGURED,
} from "./config";
import type { AccessLevel, MembershipStatus } from "./types";

export const ACCESS_RANK: Record<AccessLevel, number> = {
  public: 0,
  basic: 1,
  full: 2,
};

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  public: "Public",
  basic: "Basic Access",
  full: "Full Access",
};

export function normalizeAccessLevel(value: unknown): AccessLevel {
  return value === "public" || value === "basic" || value === "full" ? value : "full";
}

export function accessRank(level: AccessLevel | null | undefined): number {
  return level ? ACCESS_RANK[level] ?? 0 : 0;
}

/**
 * Full Access includes every Basic benefit. Basic never includes Full-only
 * content. Public content is available to any signed-in account.
 */
export function canAccessLevel(
  userLevel: AccessLevel | null | undefined,
  contentLevel: AccessLevel | null | undefined,
): boolean {
  return accessRank(userLevel) >= accessRank(contentLevel ?? "public");
}

export function accessLabel(level: AccessLevel | null | undefined): string {
  return ACCESS_LABELS[level ?? "public"];
}

/**
 * Resolve a user's access level from verified Patreon data only.
 *
 * The mapping is explicit:
 *   - full tier id  -> Full Access
 *   - basic tier id -> Basic Access
 *   - legacy single-tier config -> Full Access (backwards compatible)
 *   - no mapping configured -> Full Access for active members (legacy amount
 *     fallback is enforced server-side)
 *
 * A previous higher tier never grants access: only the current
 * `entitled_tier_ids` returned by Patreon are considered.
 */
export function resolveAccessLevel(input: {
  membershipStatus: MembershipStatus;
  entitledTierIds: string[];
  isAdmin: boolean;
  demoMode?: boolean;
}): AccessLevel {
  const tiers = input.entitledTierIds ?? [];

  // Demo Mode mirrors the production rules but uses synthetic tier ids. The
  // demo profile is also an admin so the dashboard can be explored, so the
  // explicit demo tier must win over the admin shortcut for entitlement tests.
  if (input.demoMode) {
    if (input.membershipStatus !== "active") return "public";
    if (tiers.includes("demo-tier-basic")) return "basic";
    if (tiers.includes("demo-tier-full")) return "full";
    // Older demo profiles used a single synthetic full-access tier.
    if (tiers.includes("demo-tier-full-access")) return "full";
    return "public";
  }

  if (input.isAdmin) return "full";
  if (input.membershipStatus !== "active") return "public";

  if (PATREON_FULL_TIER_IDS.some((tierId) => tiers.includes(tierId))) return "full";
  if (PATREON_BASIC_TIER_IDS.some((tierId) => tiers.includes(tierId))) return "basic";

  if (!PATREON_TIER_MAPPING_CONFIGURED) {
    if (PATREON_LEGACY_TIER_IDS.length === 0) return "full";
    if (PATREON_LEGACY_TIER_IDS.some((tierId) => tiers.includes(tierId))) return "full";
  }

  return "public";
}
