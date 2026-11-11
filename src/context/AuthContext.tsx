import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { ADMIN_EMAILS, CONFIG_ERROR, DEMO_MODE, HAS_SUPABASE } from "../lib/config";
import { canAccessLevel, resolveAccessLevel } from "../lib/access";
import { patreonLoginUrl } from "../lib/api";
import { supabase } from "../lib/supabase";
import type {
  AccessLevel,
  MembershipStatus,
  MembershipTier,
  Profile,
} from "../lib/types";

const DEMO_KEY = "lhh_demo_profile";

function demoTierIds(tier: MembershipTier): string[] {
  return [tier === "basic" ? "demo-tier-basic" : "demo-tier-full"];
}

function makeDemoProfile(
  status: MembershipStatus,
  tier: MembershipTier = "full",
): Profile {
  return {
    id: "demo-patron-0001",
    patreon_user_id: "demo_884219",
    email: "patron@demo.jerryhub.app",
    full_name: "Demo Patron",
    avatar_url: null,
    membership_status: status,
    entitled_tier_ids: status === "active" ? demoTierIds(tier) : [],
    pledge_amount_cents: status === "active" ? (tier === "basic" ? 500 : 950) : 0,
    patreon_campaign_id: "demo-campaign",
    is_admin: true,
    last_synced_at: new Date().toISOString(),
    created_at: "2025-08-12T10:00:00Z",
  };
}

function readDemoProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

function writeDemoProfile(profile: Profile | null) {
  if (profile) localStorage.setItem(DEMO_KEY, JSON.stringify(profile));
  else localStorage.removeItem(DEMO_KEY);
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Verified access level derived from the current Patreon entitlement. */
  accessLevel: AccessLevel;
  isPatron: boolean;
  isBasic: boolean;
  isFullAccess: boolean;
  isAdmin: boolean;
  isInactivePatron: boolean;
  demoMode: boolean;
  canAccess: (level: AccessLevel) => boolean;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setDemoMembership: (status: MembershipStatus) => void;
  setDemoTier: (tier: MembershipTier) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() =>
    DEMO_MODE ? readDemoProfile() : null,
  );
  const [loading, setLoading] = useState(HAS_SUPABASE);

  const loadProfile = useCallback(async (user: User) => {
    if (!supabase) return;
    let row: Profile | null = null;

    // The database trigger creates the profile on sign-up. Retry briefly in
    // case the OAuth callback lands a fraction of a second before the trigger.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        row = data as Profile;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (row) {
      setProfile(row);
    } else {
      setProfile({
        id: user.id,
        patreon_user_id: null,
        email: user.email ?? null,
        full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        membership_status: "unknown",
        entitled_tier_ids: [],
        pledge_amount_cents: 0,
        patreon_campaign_id: null,
        is_admin: false,
        last_synced_at: null,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!DEMO_MODE) {
      // Clear any demo profile left behind by an older build so it can never
      // be mistaken for a real session.
      writeDemoProfile(null);
    }
    if (!supabase || DEMO_MODE) {
      setLoading(false);
      return;
    }
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void loadProfile(nextSession.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Patreon webhooks update profiles in Postgres. Push that change straight
  // into the UI so an expired pledge locks the library without a page reload.
  useEffect(() => {
    const client = supabase;
    if (!client || DEMO_MODE || !profile?.id) return;

    const channel = client
      .channel(`profile-status-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          const next = payload.new as Profile;
          if (next?.id) setProfile(next);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [profile?.id]);

  const login = useCallback(async (returnTo = "/auth/callback") => {
    if (DEMO_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      const next = makeDemoProfile("active", "full");
      writeDemoProfile(next);
      setProfile(next);
      return;
    }
    if (!supabase) {
      // Never fall back to a demo session in production. The configuration
      // error screen blocks the UI, but this guard keeps the failure explicit.
      console.error(CONFIG_ERROR || "Supabase is not configured.");
      return;
    }
    window.location.assign(patreonLoginUrl(returnTo));
  }, []);

  const logout = useCallback(async () => {
    writeDemoProfile(null);
    if (DEMO_MODE) {
      setProfile(null);
      return;
    }
    if (supabase) await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (DEMO_MODE) {
      setProfile(readDemoProfile());
      return;
    }
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) await loadProfile(data.user);
  }, [loadProfile]);

  const setDemoMembership = useCallback((status: MembershipStatus) => {
    if (!DEMO_MODE) return;
    setProfile((current) => {
      const base = current ?? makeDemoProfile(status, "full");
      const next = {
        ...base,
        membership_status: status,
        entitled_tier_ids: status === "active" ? base.entitled_tier_ids : [],
        pledge_amount_cents: status === "active" ? base.pledge_amount_cents : 0,
        last_synced_at: new Date().toISOString(),
      };
      writeDemoProfile(next);
      return next;
    });
  }, []);

  const setDemoTier = useCallback((tier: MembershipTier) => {
    if (!DEMO_MODE) return;
    setProfile((current) => {
      const base = current ?? makeDemoProfile("active", tier);
      const next: Profile = {
        ...base,
        membership_status: "active",
        entitled_tier_ids: demoTierIds(tier),
        pledge_amount_cents: tier === "basic" ? 500 : 950,
        last_synced_at: new Date().toISOString(),
      };
      writeDemoProfile(next);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin =
      Boolean(profile?.is_admin) ||
      (Boolean(profile?.email) && ADMIN_EMAILS.includes((profile?.email ?? "").toLowerCase()));

    const accessLevel = profile
      ? resolveAccessLevel({
          membershipStatus: profile.membership_status,
          entitledTierIds: profile.entitled_tier_ids ?? [],
          isAdmin,
          demoMode: DEMO_MODE,
        })
      : "public";

    const isPatron = accessLevel === "basic" || accessLevel === "full";
    const isBasic = accessLevel === "basic";
    const isFullAccess = accessLevel === "full";

    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      accessLevel,
      isPatron,
      isBasic,
      isFullAccess,
      isAdmin,
      isInactivePatron: Boolean(profile) && !isPatron && !isAdmin,
      demoMode: DEMO_MODE,
      canAccess: (level: AccessLevel) => canAccessLevel(accessLevel, level),
      login,
      logout,
      refreshProfile,
      setDemoMembership,
      setDemoTier,
    };
  }, [session, profile, loading, login, logout, refreshProfile, setDemoMembership, setDemoTier]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
