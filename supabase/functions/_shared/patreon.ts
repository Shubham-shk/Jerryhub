import { optionalEnv, requiredEnv } from "./http.ts";

export const PATREON_AUTHORIZE_URL = "https://www.patreon.com/oauth2/authorize";
export const PATREON_TOKEN_URL = "https://www.patreon.com/api/oauth2/token";
export const PATREON_IDENTITY_URL = "https://www.patreon.com/api/oauth2/v2/identity";
export const PATREON_SCOPES = "identity identity[email] identity.memberships";

export interface PatreonTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  refreshTokenExpiresIn: number;
  scope: string | null;
  tokenType: string;
}

export interface PatreonMembership {
  userId: string;
  memberId: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  campaignId: string | null;
  patronStatus: string | null;
  tierIds: string[];
  amountCents: number;
  active: boolean;
}

/** Typed Patreon API failure so callers can distinguish revoked tokens (401/403). */
export class PatreonApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "PatreonApiError";
    this.status = status;
    this.code = code;
  }
}

interface JsonApiResource {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    { data?: { id?: string; type?: string } | Array<{ id?: string; type?: string }> | null }
  >;
}

interface JsonApiResponse {
  data?: JsonApiResource;
  included?: JsonApiResource[];
  errors?: Array<{ detail?: string; title?: string; code?: string }>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
  }
  return 0;
}

function relationshipId(
  resource: JsonApiResource,
  name: string,
): string | null {
  const data = resource.relationships?.[name]?.data;
  if (!data || Array.isArray(data)) return null;
  return asString(data.id);
}

function relationshipIds(
  resource: JsonApiResource,
  name: string,
): string[] {
  const data = resource.relationships?.[name]?.data;
  if (!data) return [];
  const list = Array.isArray(data) ? data : [data];
  return list.map((item) => asString(item.id)).filter((id): id is string => Boolean(id));
}

export function tierIdsFromEnv(): string[] {
  return optionalEnv("PATREON_TIER_ID")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function basicTierIdsFromEnv(): string[] {
  return optionalEnv("PATREON_BASIC_TIER_ID")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function fullTierIdsFromEnv(): string[] {
  return optionalEnv("PATREON_FULL_TIER_ID")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function tierMappingConfigured(): boolean {
  return basicTierIdsFromEnv().length > 0 || fullTierIdsFromEnv().length > 0;
}

export type AccessLevel = "public" | "basic" | "full";

/**
 * Resolve the access level from verified Patreon data only.
 *
 * The two-tier mapping is authoritative when configured. A legacy single-tier
 * configuration maps active members to Full Access for backwards compatibility.
 * With no tier configuration, the minimum pledge amount is the final fallback.
 */
export function resolveAccessLevelFromMembership(
  membership: Pick<PatreonMembership, "patronStatus" | "campaignId" | "tierIds" | "amountCents">,
): AccessLevel {
  if (membership.patronStatus !== "active_patron") return "public";

  const campaignId = optionalEnv("PATREON_CAMPAIGN_ID");
  if (campaignId && membership.campaignId !== campaignId) return "public";

  const basic = basicTierIdsFromEnv();
  const full = fullTierIdsFromEnv();

  if (basic.length > 0 || full.length > 0) {
    if (full.some((tierId) => membership.tierIds.includes(tierId))) return "full";
    if (basic.some((tierId) => membership.tierIds.includes(tierId))) return "basic";
    return "public";
  }

  const legacy = tierIdsFromEnv();
  if (legacy.length > 0) {
    return legacy.some((tierId) => membership.tierIds.includes(tierId)) ? "full" : "public";
  }

  return membership.amountCents >= requiredAmountCents() ? "full" : "public";
}

export function requiredAmountCents(): number {
  const value = Number(optionalEnv("PATREON_REQUIRED_AMOUNT_CENTS") || "500");
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 500;
}

/**
 * A member is entitled only when Patreon says the pledge is active, it belongs
 * to our campaign, and it includes a configured Basic/Full tier (or meets the
 * fallback minimum pledge amount when no tier id is configured).
 */
export function isEntitled(
  membership: Pick<PatreonMembership, "patronStatus" | "campaignId" | "tierIds" | "amountCents">,
): boolean {
  return resolveAccessLevelFromMembership(membership) !== "public";
}

function tokenSetFromPayload(payload: Record<string, unknown>): PatreonTokenSet {
  return {
    accessToken: payload.access_token as string,
    refreshToken: asString(payload.refresh_token),
    expiresIn: asNumber(payload.expires_in),
    refreshTokenExpiresIn: asNumber(payload.refresh_token_expires_in),
    scope: asString(payload.scope),
    tokenType: asString(payload.token_type) || "Bearer",
  };
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<PatreonTokenSet> {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: requiredEnv("PATREON_CLIENT_ID"),
    client_secret: requiredEnv("PATREON_CLIENT_SECRET"),
    redirect_uri: redirectUri,
  });

  const response = await fetch(PATREON_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof payload.access_token !== "string") {
    const detail = asString(payload.error_description) || asString(payload.error) || "Token exchange failed";
    throw new PatreonApiError(detail, response.status, asString(payload.error));
  }

  return tokenSetFromPayload(payload);
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<PatreonTokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: requiredEnv("PATREON_CLIENT_ID"),
    client_secret: requiredEnv("PATREON_CLIENT_SECRET"),
  });

  const response = await fetch(PATREON_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof payload.access_token !== "string") {
    const detail = asString(payload.error_description) || asString(payload.error) || "Token refresh failed";
    throw new PatreonApiError(detail, response.status, asString(payload.error));
  }

  return tokenSetFromPayload(payload);
}

export async function fetchIdentity(accessToken: string): Promise<PatreonMembership> {
  const params = new URLSearchParams({
    include: "memberships,memberships.campaign,memberships.currently_entitled_tiers",
    "fields[user]": "email,full_name,image_url",
    "fields[member]":
      "patron_status,currently_entitled_amount_cents,pledge_relationship_start,last_charge_status",
    "fields[tier]": "title,amount_cents",
  });

  const response = await fetch(`${PATREON_IDENTITY_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const payload = (await response.json().catch(() => ({}))) as JsonApiResponse;
  if (!response.ok || !payload.data) {
    const detail = payload.errors?.[0]?.detail || payload.errors?.[0]?.title || "Could not read Patreon identity";
    throw new PatreonApiError(detail, response.status, payload.errors?.[0]?.code ?? null);
  }

  const user = payload.data;
  const members = (payload.included ?? []).filter((item) => item.type === "member");
  const campaignId = optionalEnv("PATREON_CAMPAIGN_ID");

  const matchingMembers = campaignId
    ? members.filter((member) => relationshipId(member, "campaign") === campaignId)
    : members;

  // When a campaign id is configured, never fall back to a membership in a
  // different campaign. A user can support multiple creators, and using another
  // campaign's membership would store misleading status/tier data.
  const member = campaignId
    ? matchingMembers.find((item) => item.attributes?.patron_status === "active_patron") ??
      matchingMembers[0] ??
      null
    : members.find((item) => item.attributes?.patron_status === "active_patron") ??
      members[0] ??
      null;

  const tierIds = member ? relationshipIds(member, "currently_entitled_tiers") : [];
  const patronStatus = asString(member?.attributes?.patron_status);
  const amountCents = asNumber(member?.attributes?.currently_entitled_amount_cents);
  const memberCampaignId = member ? relationshipId(member, "campaign") : null;

  const membership: PatreonMembership = {
    userId: asString(user.id) || "",
    memberId: asString(member?.id),
    email: asString(user.attributes?.email) || asString(member?.attributes?.email),
    fullName: asString(user.attributes?.full_name) || asString(member?.attributes?.full_name),
    avatarUrl: asString(user.attributes?.image_url),
    campaignId: memberCampaignId,
    patronStatus,
    tierIds,
    amountCents,
    active: false,
  };

  membership.active = isEntitled(membership);
  return membership;
}

export function membershipFromWebhook(
  resource: JsonApiResource | undefined,
  eventName: string,
  included: JsonApiResource[] = [],
): {
  userId: string | null;
  memberId: string | null;
  email: string | null;
  fullName: string | null;
  campaignId: string | null;
  patronStatus: string | null;
  tierIds: string[];
  amountCents: number;
  active: boolean;
} | null {
  if (!resource || resource.type !== "member") return null;

  const userId = relationshipId(resource, "user");
  const memberId = asString(resource.id);
  const includedUser = included.find(
    (item) => item.type === "user" && (!userId || item.id === userId),
  );
  const email =
    asString(includedUser?.attributes?.email) || asString(resource.attributes?.email);
  const fullName =
    asString(includedUser?.attributes?.full_name) ||
    asString(resource.attributes?.full_name);
  const campaignId = relationshipId(resource, "campaign");
  const tierIds = relationshipIds(resource, "currently_entitled_tiers");
  const amountCents = asNumber(resource.attributes?.currently_entitled_amount_cents);
  const deleted = eventName.includes("delete");
  const patronStatus = deleted ? "former_patron" : asString(resource.attributes?.patron_status);

  return {
    userId,
    memberId,
    email,
    fullName,
    campaignId,
    patronStatus,
    tierIds,
    amountCents,
    active: !deleted && isEntitled({ patronStatus, campaignId, tierIds, amountCents }),
  };
}

export type { JsonApiResource };
