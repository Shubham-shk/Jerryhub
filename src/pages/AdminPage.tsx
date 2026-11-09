import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Database,
  ExternalLink,
  FileText,
  Film,
  Flame,
  History,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { MembershipBanner } from "../components/MembershipBanner";
import { StatusPill } from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { fetchAllMediaSets, fetchSetAssets, thumbnailUrl } from "../lib/api";
import {
  BASIC_PRICE_LABEL,
  DEMO_MODE,
  FULL_PRICE_LABEL,
  PATREON_BASIC_TIER_IDS,
  PATREON_FULL_TIER_IDS,
  PATREON_LEGACY_TIER_IDS,
  PATREON_TIER_MAPPING_CONFIGURED,
} from "../lib/config";
import { accessLabel, normalizeAccessLevel, resolveAccessLevel } from "../lib/access";
import { requireSupabase } from "../lib/supabase";
import type {
  AccessLevel,
  MediaAsset,
  MediaCategory,
  MediaSet,
  MediaType,
  Profile,
} from "../lib/types";

const typeOptions: Array<{ value: MediaType; label: string }> = [
  { value: "video", label: "Video" },
  { value: "image", label: "Image set" },
  { value: "pdf", label: "PDF story" },
  { value: "funscript", label: "Funscript" },
];

const categoryOptions: Array<{ value: MediaCategory; label: string }> = [
  { value: "animation", label: "Newest Uploads (animation)" },
  { value: "arts", label: "NSFW Arts & Videos" },
  { value: "games", label: "2D Games" },
  { value: "comics", label: "Manga + Comics" },
];

const accessOptions: Array<{ value: AccessLevel; label: string }> = [
  { value: "public", label: "Public" },
  { value: "basic", label: "Basic Access" },
  { value: "full", label: "Full Access" },
];

interface MembershipEvent {
  id: string;
  profile_id: string;
  event_type: string;
  from_tier: string | null;
  to_tier: string | null;
  created_at: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function typeLabel(type: MediaType): string {
  return typeOptions.find((option) => option.value === type)?.label ?? type;
}

const categoryShortLabels: Record<MediaCategory, string> = {
  animation: "Animation",
  arts: "Arts & video",
  games: "2D Games",
  comics: "Comics",
};

export function AdminPage() {
  useDocumentTitle("Admin");
  const { isAdmin, profile, loading: authLoading, demoMode, login } = useAuth();
  const { toast } = useUI();
  const [sets, setSets] = useState<MediaSet[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSet, setExpandedSet] = useState<string | null>(null);
  const [adminAssets, setAdminAssets] = useState<Record<string, MediaAsset[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [events, setEvents] = useState<MembershipEvent[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    primary_type: "video" as MediaType,
    category: "animation" as MediaCategory,
    access_level: "full" as AccessLevel,
    is_trending: false,
    is_new: true,
    duration: "",
  });
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  const [assetSetId, setAssetSetId] = useState("");
  const [assetType, setAssetType] = useState<MediaType>("video");
  const [assetFiles, setAssetFiles] = useState<File[]>([]);
  const [assetDuration, setAssetDuration] = useState("");
  const [uploading, setUploading] = useState(false);
  const assetInputRef = useRef<HTMLInputElement | null>(null);

  const loadSets = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchAllMediaSets();
      setSets(data);
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Could not load sets.", "error");
    } finally {
      setLoadingSets(false);
      setRefreshing(false);
    }
  }, [toast]);

  const loadMembers = useCallback(async () => {
    if (DEMO_MODE) {
      setMembers(profile ? [profile] : []);
      setEvents([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const client = requireSupabase();
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setMembers((data ?? []) as Profile[]);

      // Membership events are optional: older databases may not have the table.
      const history = await client
        .from("membership_events")
        .select("id, profile_id, event_type, from_tier, to_tier, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setEvents(history.error ? [] : ((history.data ?? []) as MembershipEvent[]));
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Could not load members.", "error");
    } finally {
      setLoadingMembers(false);
    }
  }, [profile, toast]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      void loadSets();
      void loadMembers();
    }
  }, [authLoading, isAdmin, loadSets, loadMembers]);

  async function loadAssets(setId: string) {
    if (adminAssets[setId]) return;
    try {
      const data = await fetchSetAssets(setId);
      setAdminAssets((current) => ({ ...current, [setId]: data }));
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Could not load files.", "error");
    }
  }

  function requireLive(): boolean {
    if (DEMO_MODE) {
      toast("Demo mode: connect Supabase to enable admin writes.", "error");
      return false;
    }
    return true;
  }

  async function handleCreateSet(event: React.FormEvent) {
    event.preventDefault();
    if (!requireLive()) return;
    if (!form.title.trim()) {
      toast("Give the set a title.", "error");
      return;
    }
    if (!thumbnail) {
      toast("Choose a thumbnail image.", "error");
      return;
    }

    setCreating(true);
    const client = requireSupabase();
    let uploadedPath: string | null = null;
    try {
      const path = `sets/${crypto.randomUUID()}-${safeName(thumbnail.name)}`;
      const upload = await client.storage
        .from("thumbnails")
        .upload(path, thumbnail, { cacheControl: "3600", upsert: false });
      if (upload.error) throw upload.error;
      uploadedPath = path;

      const slugBase = slugify(form.title) || "untitled";
      const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
      const maxSort = sets.reduce((max, set) => Math.max(max, set.sort_order), 0);

      const insert = await client.from("media_sets").insert({
        slug,
        title: form.title.trim(),
        description: form.description.trim() || null,
        thumbnail_path: path,
        primary_type: form.primary_type,
        category: form.category,
        access_level: form.access_level,
        is_trending: form.is_trending,
        is_new: form.is_new,
        published: true,
        duration_seconds: form.duration ? Number(form.duration) : null,
        sort_order: maxSort + 1,
      });
      if (insert.error) throw insert.error;

      toast("Media set created.", "success");
      setForm({
        title: "",
        description: "",
        primary_type: "video",
        category: "animation",
        access_level: "full",
        is_trending: false,
        is_new: true,
        duration: "",
      });
      setThumbnail(null);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      await loadSets();
    } catch (nextError) {
      if (uploadedPath) {
        await client.storage.from("thumbnails").remove([uploadedPath]);
      }
      toast(nextError instanceof Error ? nextError.message : "Could not create the set.", "error");
    } finally {
      setCreating(false);
    }
  }

  async function updateCategory(set: MediaSet, category: MediaCategory) {
    if (!requireLive()) return;
    const client = requireSupabase();
    setBusy(`${set.id}-category`);
    try {
      const update = await client
        .from("media_sets")
        .update({ category })
        .eq("id", set.id);
      if (update.error) throw update.error;
      setSets((current) =>
        current.map((item) => (item.id === set.id ? { ...item, category } : item)),
      );
      toast(`Moved to ${categoryShortLabels[category]}.`, "success");
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Update failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function updateAccess(set: MediaSet, accessLevel: AccessLevel) {
    if (!requireLive()) return;
    const client = requireSupabase();
    setBusy(`${set.id}-access`);
    try {
      const update = await client
        .from("media_sets")
        .update({ access_level: accessLevel })
        .eq("id", set.id);
      if (update.error) throw update.error;
      setSets((current) =>
        current.map((item) => (item.id === set.id ? { ...item, access_level: accessLevel } : item)),
      );
      toast(`Access set to ${accessLabel(accessLevel)}.`, "success");
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Update failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function updateMemberAccess(member: Profile, level: "basic" | "full" | "public") {
    if (!requireLive()) return;
    if (level === "basic" && !PATREON_BASIC_TIER_IDS.length) {
      toast("Configure VITE_PATREON_BASIC_TIER_ID before assigning Basic Access.", "error");
      return;
    }
    if (level === "full" && !PATREON_FULL_TIER_IDS.length) {
      toast("Configure VITE_PATREON_FULL_TIER_ID before assigning Full Access.", "error");
      return;
    }
    const tierId =
      level === "basic"
        ? PATREON_BASIC_TIER_IDS[0]
        : level === "full"
          ? PATREON_FULL_TIER_IDS[0]
          : null;
    const client = requireSupabase();
    setBusy(`${member.id}-access`);
    try {
      const update = await client
        .from("profiles")
        .update({
          membership_status: level === "public" ? "inactive" : "active",
          entitled_tier_ids: tierId ? [tierId] : [],
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", member.id);
      if (update.error) throw update.error;
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id
            ? {
                ...item,
                membership_status: level === "public" ? "inactive" : "active",
                entitled_tier_ids: tierId ? [tierId] : [],
              }
            : item,
        ),
      );
      toast(`Access updated to ${accessLabel(level)}.`, "success");
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Update failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFlag(set: MediaSet, field: "is_trending" | "is_new") {
    if (!requireLive()) return;
    const client = requireSupabase();
    setBusy(`${set.id}-${field}`);
    try {
      const update = await client
        .from("media_sets")
        .update({ [field]: !set[field] })
        .eq("id", set.id);
      if (update.error) throw update.error;
      setSets((current) =>
        current.map((item) => (item.id === set.id ? { ...item, [field]: !set[field] } : item)),
      );
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Update failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSet(set: MediaSet) {
    if (!requireLive()) return;
    if (!window.confirm(`Delete “${set.title}” and every file inside it? This cannot be undone.`)) {
      return;
    }
    const client = requireSupabase();
    setBusy(`${set.id}-delete`);
    try {
      const assets = adminAssets[set.id] ?? (await fetchSetAssets(set.id));
      if (assets.length) {
        await client.storage.from("premium").remove(assets.map((asset) => asset.storage_path));
      }
      if (set.thumbnail_path && !/^https?:\/\//i.test(set.thumbnail_path)) {
        await client.storage.from("thumbnails").remove([set.thumbnail_path]);
      }
      const remove = await client.from("media_sets").delete().eq("id", set.id);
      if (remove.error) throw remove.error;
      toast("Set deleted.", "success");
      setExpandedSet(null);
      await loadSets();
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Delete failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleAddAssets(event: React.FormEvent) {
    event.preventDefault();
    if (!requireLive()) return;
    if (!assetSetId) {
      toast("Choose a set.", "error");
      return;
    }
    if (!assetFiles.length) {
      toast("Choose at least one file.", "error");
      return;
    }

    setUploading(true);
    const client = requireSupabase();
    try {
      const existing = await fetchSetAssets(assetSetId);
      let sort = existing.length;
      for (const file of assetFiles) {
        const path = `sets/${assetSetId}/${crypto.randomUUID()}-${safeName(file.name)}`;
        const upload = await client.storage
          .from("premium")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upload.error) throw upload.error;

        const insert = await client.from("media_assets").insert({
          set_id: assetSetId,
          type: assetType,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          duration_seconds: assetDuration ? Number(assetDuration) : null,
          sort_order: sort,
        });
        if (insert.error) throw insert.error;
        sort += 1;
      }
      toast(`${assetFiles.length} file${assetFiles.length === 1 ? "" : "s"} uploaded.`, "success");
      setAssetFiles([]);
      setAssetDuration("");
      if (assetInputRef.current) assetInputRef.current.value = "";
      setAdminAssets((current) => {
        const next = { ...current };
        delete next[assetSetId];
        return next;
      });
      await loadSets();
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    if (!requireLive()) return;
    if (!window.confirm(`Delete ${asset.file_name}?`)) return;
    const client = requireSupabase();
    setBusy(`${asset.id}-delete`);
    try {
      await client.storage.from("premium").remove([asset.storage_path]);
      const remove = await client.from("media_assets").delete().eq("id", asset.id);
      if (remove.error) throw remove.error;
      setAdminAssets((current) => ({
        ...current,
        [asset.set_id]: (current[asset.set_id] ?? []).filter((item) => item.id !== asset.id),
      }));
      toast("File deleted.", "success");
      await loadSets();
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Delete failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleAdminLogin() {
    sessionStorage.setItem("lhh_post_login_path", "/admin");
    await login();
  }

  if (authLoading) {
    return (
      <div className="admin-gate">
        <Loader2 size={28} className="spin" />
        <p>Checking admin access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <span className="admin-gate-icon"><KeyRound size={30} /></span>
        <p className="eyebrow">Restricted area</p>
        <h1>Admin access only.</h1>
        <p>
          This dashboard is limited to the site owner. Sign in with the admin Patreon
          account, or mark your profile as an admin in Supabase.
        </p>
        {profile ? (
          <Link to="/account" className="btn btn--primary">Go to my account</Link>
        ) : (
          <button type="button" className="btn btn--patreon" onClick={() => void handleAdminLogin()}>
            Log in with Patreon
          </button>
        )}
      </div>
    );
  }

  const totalFiles = sets.reduce((total, set) => total + set.asset_count, 0);
  const trendingCount = sets.filter((set) => set.is_trending).length;
  const newCount = sets.filter((set) => set.is_new).length;

  const memberLevel = (member: Profile) =>
    resolveAccessLevel({
      membershipStatus: member.membership_status,
      entitledTierIds: member.entitled_tier_ids ?? [],
      isAdmin: Boolean(member.is_admin),
      demoMode,
    });
  const basicMembers = members.filter((member) => memberLevel(member) === "basic").length;
  const fullMembers = members.filter((member) => memberLevel(member) === "full").length;

  return (
    <>
      <section className="page-hero page-hero--admin">
        <div className="container page-hero-inner">
          <div className="admin-hero-row">
            <div>
              <p className="eyebrow"><LayoutDashboard size={14} /> Admin dashboard</p>
              <h1>Library control room</h1>
              <p>Upload media sets, add files and curate what appears on the homepage.</p>
            </div>
            <div className="admin-hero-user">
              <StatusPill status={profile?.membership_status ?? "unknown"} />
              <span>{profile?.email}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadSets()} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <MembershipBanner />

      <section className="section admin-section">
        <div className="container">
          {demoMode && (
            <div className="admin-demo-notice">
              <AlertTriangle size={19} />
              <div>
                <strong>Demo mode.</strong> You&apos;re viewing the admin UI with sample data.
                Connect Supabase and mark your profile as admin to enable uploads and edits.
              </div>
            </div>
          )}

          <div className="admin-stats">
            <div><span className="admin-stat-icon"><Film size={18} /></span><strong>{sets.length}</strong><span>Media sets</span></div>
            <div><span className="admin-stat-icon"><Database size={18} /></span><strong>{totalFiles}</strong><span>Files</span></div>
            <div><span className="admin-stat-icon"><Flame size={18} /></span><strong>{trendingCount}</strong><span>Trending</span></div>
            <div><span className="admin-stat-icon"><Sparkles size={18} /></span><strong>{newCount}</strong><span>New</span></div>
            <div><span className="admin-stat-icon"><ShieldCheck size={18} /></span><strong>{basicMembers}</strong><span>Basic members</span></div>
            <div><span className="admin-stat-icon"><ShieldCheck size={18} /></span><strong>{fullMembers}</strong><span>Full members</span></div>
          </div>

          <div className="admin-members-grid">
            <div className="admin-card admin-members">
              <div className="admin-card-head">
                <div>
                  <p className="eyebrow">Members</p>
                  <h2>Membership access</h2>
                </div>
                <span className="admin-card-badge"><Users size={14} /> {members.length} profiles</span>
              </div>
              {loadingMembers ? (
                <div className="admin-loading"><Loader2 size={20} className="spin" /> Loading members…</div>
              ) : members.length ? (
                <div className="admin-member-list">
                  <div className="admin-member-head">
                    <span>Member</span>
                    <span>Status</span>
                    <span>Access</span>
                    <span>Patreon tier</span>
                    <span>Change</span>
                  </div>
                  {members.map((member) => {
                    const level = memberLevel(member);
                    return (
                      <div className="admin-member-row" key={member.id}>
                        <div className="admin-member-id">
                          <strong>{member.full_name || member.email || "Member"}</strong>
                          <span>{member.email || member.patreon_user_id || member.id}</span>
                        </div>
                        <StatusPill status={member.membership_status} />
                        <span className={`admin-access-pill admin-access-pill--${level}`}>
                          {accessLabel(level)}
                        </span>
                        <code className="admin-member-tiers">
                          {member.entitled_tier_ids?.length
                            ? member.entitled_tier_ids.join(", ")
                            : "—"}
                        </code>
                        <select
                          value={level === "basic" ? "basic" : level === "full" ? "full" : "public"}
                          onChange={(event) =>
                            void updateMemberAccess(
                              member,
                              event.target.value as "basic" | "full" | "public",
                            )
                          }
                          disabled={DEMO_MODE || busy === `${member.id}-access`}
                          aria-label={`Change access for ${member.email ?? member.id}`}
                        >
                          <option value="public">Public</option>
                          <option value="basic">Basic Access</option>
                          <option value="full">Full Access</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="admin-assets-empty">No profiles loaded.</p>
              )}
            </div>

            <div className="admin-card admin-mapping">
              <div className="admin-card-head">
                <div>
                  <p className="eyebrow">Patreon</p>
                  <h2>Tier mapping</h2>
                </div>
                <span className="admin-card-badge"><KeyRound size={14} /> Secure config</span>
              </div>
              <div className="admin-mapping-list">
                <div>
                  <span>Basic Access ({BASIC_PRICE_LABEL})</span>
                  <code>
                    {PATREON_BASIC_TIER_IDS.length
                      ? PATREON_BASIC_TIER_IDS.join(", ")
                      : "Not configured"}
                  </code>
                </div>
                <div>
                  <span>Full Access ({FULL_PRICE_LABEL})</span>
                  <code>
                    {PATREON_FULL_TIER_IDS.length
                      ? PATREON_FULL_TIER_IDS.join(", ")
                      : "Not configured"}
                  </code>
                </div>
                <div>
                  <span>Legacy single tier</span>
                  <code>
                    {PATREON_LEGACY_TIER_IDS.length
                      ? PATREON_LEGACY_TIER_IDS.join(", ")
                      : "None"}
                  </code>
                </div>
              </div>
              {!PATREON_TIER_MAPPING_CONFIGURED && (
                <p className="admin-mapping-warning">
                  <AlertTriangle size={14} /> No Basic/Full tier IDs are configured. Set
                  VITE_PATREON_BASIC_TIER_ID and VITE_PATREON_FULL_TIER_ID so access is
                  resolved from verified Patreon tiers instead of a fallback.
                </p>
              )}
              <p className="admin-mapping-note">
                Tier IDs come from Patreon and secure environment configuration. Displayed
                prices and payment amounts are never used to grant access.
              </p>
            </div>
          </div>

          <div className="admin-card admin-events">
            <div className="admin-card-head">
              <div>
                <p className="eyebrow">Audit</p>
                <h2>Membership changes</h2>
              </div>
              <span className="admin-card-badge"><History size={14} /> Latest 50</span>
            </div>
            {events.length ? (
              <div className="admin-event-list">
                {events.map((event) => (
                  <div className="admin-event-row" key={event.id}>
                    <span>{new Date(event.created_at).toLocaleString()}</span>
                    <strong>{event.event_type.replace(/_/g, " ")}</strong>
                    <code>
                      {event.from_tier || "—"} → {event.to_tier || "—"}
                    </code>
                    <span>{event.profile_id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-assets-empty">
                No membership changes recorded yet. Events appear here when the Patreon
                webhook updates a member&apos;s tier or status.
              </p>
            )}
          </div>

          <div className="admin-grid">
            <form className="admin-card admin-form" onSubmit={handleCreateSet}>
              <div className="admin-card-head">
                <div>
                  <p className="eyebrow">Step 1</p>
                  <h2>Create a media set</h2>
                </div>
                <span className="admin-card-badge"><Plus size={14} /> New set</span>
              </div>

              <label className="field">
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Midnight Velvet"
                  disabled={creating}
                />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="A short, enticing description for the card and player."
                  disabled={creating}
                />
              </label>

              <label className="field">
                <span>Homepage collection</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value as MediaCategory })}
                  disabled={creating}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Access level</span>
                <select
                  value={form.access_level}
                  onChange={(event) => setForm({ ...form, access_level: event.target.value as AccessLevel })}
                  disabled={creating}
                >
                  {accessOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="field-row">
                <label className="field">
                  <span>Primary type</span>
                  <select
                    value={form.primary_type}
                    onChange={(event) => setForm({ ...form, primary_type: event.target.value as MediaType })}
                    disabled={creating}
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Duration (seconds)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.duration}
                    onChange={(event) => setForm({ ...form, duration: event.target.value })}
                    placeholder="Optional"
                    disabled={creating}
                  />
                </label>
              </div>

              <label className="field">
                <span>Thumbnail</span>
                <span className="file-input">
                  <UploadCloud size={18} />
                  <span>{thumbnail ? thumbnail.name : "Choose a portrait 2:3 image"}</span>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => setThumbnail(event.target.files?.[0] ?? null)}
                    disabled={creating}
                  />
                </span>
              </label>

              <div className="toggle-row">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={form.is_trending}
                    onChange={(event) => setForm({ ...form, is_trending: event.target.checked })}
                    disabled={creating}
                  />
                  <span className="switch-track" />
                  <span>Trending</span>
                </label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={form.is_new}
                    onChange={(event) => setForm({ ...form, is_new: event.target.checked })}
                    disabled={creating}
                  />
                  <span className="switch-track" />
                  <span>New</span>
                </label>
              </div>

              <button type="submit" className="btn btn--primary btn--block" disabled={creating || DEMO_MODE}>
                {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                Create media set
              </button>
            </form>

            <form className="admin-card admin-form" onSubmit={handleAddAssets}>
              <div className="admin-card-head">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2>Add files</h2>
                </div>
                <span className="admin-card-badge"><UploadCloud size={14} /> Private bucket</span>
              </div>

              <label className="field">
                <span>Media set</span>
                <select
                  value={assetSetId}
                  onChange={(event) => {
                    setAssetSetId(event.target.value);
                    if (event.target.value) void loadAssets(event.target.value);
                  }}
                  disabled={uploading}
                >
                  <option value="">Choose a set…</option>
                  {sets.map((set) => (
                    <option key={set.id} value={set.id}>{set.title}</option>
                  ))}
                </select>
              </label>

              <div className="field-row">
                <label className="field">
                  <span>File type</span>
                  <select
                    value={assetType}
                    onChange={(event) => setAssetType(event.target.value as MediaType)}
                    disabled={uploading}
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Duration (seconds)</span>
                  <input
                    type="number"
                    min={0}
                    value={assetDuration}
                    onChange={(event) => setAssetDuration(event.target.value)}
                    placeholder="For video"
                    disabled={uploading}
                  />
                </label>
              </div>

              <label className="field">
                <span>Files</span>
                <span className="file-input">
                  <UploadCloud size={18} />
                  <span>
                    {assetFiles.length
                      ? `${assetFiles.length} file${assetFiles.length === 1 ? "" : "s"} selected`
                      : "Choose one or more files"}
                  </span>
                  <input
                    ref={assetInputRef}
                    type="file"
                    multiple
                    accept={
                      assetType === "video" ? "video/*" :
                      assetType === "image" ? "image/*" :
                      assetType === "pdf" ? "application/pdf" :
                      ".funscript,application/json"
                    }
                    onChange={(event) => setAssetFiles(Array.from(event.target.files ?? []))}
                    disabled={uploading}
                  />
                </span>
              </label>

              <div className="admin-upload-note">
                <KeyRound size={14} />
                Uploads go to the private <code>premium</code> bucket. Only active patrons can
                request signed URLs.
              </div>

              <button type="submit" className="btn btn--primary btn--block" disabled={uploading || DEMO_MODE}>
                {uploading ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />}
                Upload files
              </button>
            </form>
          </div>

          <div className="admin-library">
            <div className="admin-library-head">
              <div>
                <p className="eyebrow">The library</p>
                <h2>All media sets</h2>
              </div>
              <span>{sets.length} sets · {totalFiles} files</span>
            </div>

            {loadingSets ? (
              <div className="admin-loading"><Loader2 size={24} className="spin" /> Loading sets…</div>
            ) : (
              <div className="admin-table">
                <div className="admin-table-head">
                  <span>Set</span>
                  <span>Collection</span>
                  <span>Access</span>
                  <span>Flags</span>
                  <span>Files</span>
                  <span>Actions</span>
                </div>
                {sets.map((set) => {
                  const isOpen = expandedSet === set.id;
                  const assets = adminAssets[set.id];
                  return (
                    <div className={`admin-row-wrap${isOpen ? " is-open" : ""}`} key={set.id}>
                      <div className="admin-row">
                        <div className="admin-row-set">
                          <img src={thumbnailUrl(set.thumbnail_path)} alt="" />
                          <div>
                            <strong>{set.title}</strong>
                            <span>/{set.slug}</span>
                          </div>
                        </div>
                        <span className="admin-row-type">
                          <select
                            value={set.category}
                            onChange={(event) =>
                              void updateCategory(set, event.target.value as MediaCategory)
                            }
                            disabled={DEMO_MODE || busy === `${set.id}-category`}
                            aria-label={`Collection for ${set.title}`}
                          >
                            {(Object.keys(categoryShortLabels) as MediaCategory[]).map((value) => (
                              <option key={value} value={value}>{categoryShortLabels[value]}</option>
                            ))}
                          </select>
                          <small>{typeLabel(set.primary_type)}</small>
                        </span>
                        <span className="admin-row-access">
                          <select
                            value={normalizeAccessLevel(set.access_level)}
                            onChange={(event) =>
                              void updateAccess(set, event.target.value as AccessLevel)
                            }
                            disabled={DEMO_MODE || busy === `${set.id}-access`}
                            aria-label={`Access level for ${set.title}`}
                          >
                            {accessOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </span>
                        <div className="admin-row-flags">
                          <button
                            type="button"
                            className={`flag-toggle${set.is_trending ? " is-on" : ""}`}
                            onClick={() => void toggleFlag(set, "is_trending")}
                            disabled={busy === `${set.id}-is_trending`}
                            title="Toggle trending"
                          >
                            <Flame size={13} /> Trending
                          </button>
                          <button
                            type="button"
                            className={`flag-toggle${set.is_new ? " is-on" : ""}`}
                            onClick={() => void toggleFlag(set, "is_new")}
                            disabled={busy === `${set.id}-is_new`}
                            title="Toggle new"
                          >
                            <Sparkles size={13} /> New
                          </button>
                        </div>
                        <span className="admin-row-files">{set.asset_count}</span>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Show files in ${set.title}`}
                            onClick={() => {
                              const next = isOpen ? null : set.id;
                              setExpandedSet(next);
                              if (next) void loadAssets(next);
                            }}
                          >
                            <ChevronDown size={17} className={isOpen ? "rotate-180" : ""} />
                          </button>
                          <Link
                            to={`/?preview=${set.slug}`}
                            className="icon-btn"
                            aria-label="View on site"
                            onClick={(event) => event.preventDefault()}
                          >
                            <ExternalLink size={15} />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn icon-btn--danger"
                            aria-label={`Delete ${set.title}`}
                            onClick={() => void deleteSet(set)}
                            disabled={busy === `${set.id}-delete`}
                          >
                            {busy === `${set.id}-delete` ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="admin-assets">
                          <div className="admin-assets-head">
                            <span>Files in this set</span>
                            <span>{assets ? `${assets.length} loaded` : "Loading…"}</span>
                          </div>
                          {!assets ? (
                            <div className="admin-assets-loading"><Loader2 size={18} className="spin" /></div>
                          ) : assets.length ? (
                            <div className="admin-assets-list">
                              {assets.map((asset) => (
                                <div className="admin-asset" key={asset.id}>
                                  <span className={`admin-asset-icon admin-asset-icon--${asset.type}`}>
                                    {asset.type === "video" ? <Film size={15} /> :
                                      asset.type === "image" ? <ImageIcon size={15} /> :
                                      asset.type === "pdf" ? <FileText size={15} /> :
                                      <Flame size={15} />}
                                  </span>
                                  <div>
                                    <strong>{asset.file_name}</strong>
                                    <span>{typeLabel(asset.type)} · {asset.size_bytes ? `${(asset.size_bytes / 1024 / 1024).toFixed(1)} MB` : "—"}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="icon-btn icon-btn--danger"
                                    aria-label={`Delete ${asset.file_name}`}
                                    onClick={() => void deleteAsset(asset)}
                                    disabled={busy === `${asset.id}-delete`}
                                  >
                                    {busy === `${asset.id}-delete` ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="admin-assets-empty">No files yet. Use the upload form above.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-tips">
            <div>
              <span><Check size={15} /></span>
              <p><strong>Thumbnails are public.</strong> They live in the public <code>thumbnails</code> bucket so cards render before login.</p>
            </div>
            <div>
              <span><KeyRound size={15} /></span>
              <p><strong>Premium files stay private.</strong> Videos, images, PDFs and funscripts live in <code>premium</code> and are signed on demand.</p>
            </div>
            <div>
              <span><X size={15} /></span>
              <p><strong>Deleting is permanent.</strong> Removing a set deletes its database rows and storage files.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
