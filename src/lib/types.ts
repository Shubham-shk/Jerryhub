export type MembershipStatus = "active" | "inactive" | "unknown";
export type MediaType = "video" | "image" | "pdf" | "funscript";
export type MediaCategory = "animation" | "arts" | "games" | "comics";
export type AccessLevel = "public" | "basic" | "full";
export type MembershipTier = "basic" | "full";

export interface Profile {
  id: string;
  patreon_user_id: string | null;
  patreon_member_id?: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  membership_status: MembershipStatus;
  entitled_tier_ids: string[];
  pledge_amount_cents: number;
  patreon_campaign_id: string | null;
  is_admin: boolean;
  last_synced_at: string | null;
  created_at?: string;
}

/**
 * Safe, browser-visible view of a Patreon account connection.
 * Token columns are never granted to authenticated clients.
 */
export interface PatreonConnection {
  id: string;
  user_id: string;
  patreon_user_id: string;
  patreon_member_id: string | null;
  patreon_email: string | null;
  patreon_full_name: string | null;
  patreon_avatar_url: string | null;
  scopes: string | null;
  expires_at: string | null;
  membership_status: MembershipStatus;
  patron_status: string | null;
  entitled_tier_ids: string[];
  pledge_amount_cents: number;
  patreon_campaign_id: string | null;
  connected_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  set_id: string;
  type: MediaType;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  sort_order: number;
  demo_url?: string;
}

export interface MediaSet {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_path: string;
  primary_type: MediaType;
  category: MediaCategory;
  access_level: AccessLevel;
  asset_count: number;
  duration_seconds: number | null;
  is_trending: boolean;
  is_new: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  assets?: MediaAsset[];
  demo_assets?: MediaAsset[];

  // Rich metadata extensions for premium UI
  genre?: string;
  version?: string;
  author?: string;
  chapter_info?: string;
  rating?: string;
  tags?: string[];
  views?: number;
  banner_image?: string;
  aspect_ratio?: "a4" | "2:3" | "16:9" | "3:4" | "1:1" | "1:1.45";
}

export interface SignedAsset {
  asset: MediaAsset;
  url: string;
  expiresIn: number;
}

export interface PatreonState {
  active: boolean;
  tierIds: string[];
  amountCents: number;
}
