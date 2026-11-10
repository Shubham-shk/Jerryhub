import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { MembershipBanner } from "../components/MembershipBanner";
import { PatreonConnectionCard } from "../components/PatreonConnectionCard";
import { StatusPill } from "../components/StatusPill";
import { PatreonMark } from "../components/PatreonMark";
import { useAgeGate } from "../context/AgeGateContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  BASIC_PRICE_LABEL,
  FULL_PRICE_LABEL,
  PATREON_PAGE_URL,
  UPGRADE_CTA_LABEL,
} from "../lib/config";
import { accessLabel } from "../lib/access";
import { POSTER_IMAGES } from "../data/posters";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AccountPage() {
  useDocumentTitle("Account & Membership");
  const {
    profile,
    loading,
    accessLevel,
    isPatron,
    isBasic,
    isFullAccess,
    isAdmin,
    demoMode,
    login,
    logout,
    refreshProfile,
    setDemoTier,
    setDemoMembership,
  } = useAuth();
  const { openAuthModal, toast } = useUI();
  const { reset: resetAgeGate } = useAgeGate();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  async function handleLogin() {
    sessionStorage.setItem("lhh_post_login_path", "/account");
    await login();
    if (demoMode) toast("Demo mode: signed in as an active patron.", "success");
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshProfile();
      toast("Membership status refreshed.", "success");
    } catch {
      toast("Could not refresh your membership. Try again.", "error");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await logout();
    toast("Signed out.");
    navigate("/");
  }

  const initials = (profile?.full_name || profile?.email || "P")
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <>
      <section className="page-hero page-hero--account">
        <div className="container page-hero-inner">
          <p className="eyebrow">Your account</p>
          <h1>Membership &amp; access</h1>
          <p>Everything tied to your Patreon account, in one place.</p>
        </div>
      </section>

      <MembershipBanner />

      <section className="section account-section">
        <div className="container account-layout">
          {loading ? (
            <div className="account-card account-card--loading">
              <Loader2 size={26} className="spin" />
              <p>Checking your Patreon membership…</p>
            </div>
          ) : !profile ? (
            <div className="account-guest">
              <div className="account-guest-copy">
                <span className="account-guest-icon"><UserRound size={28} /></span>
                <p className="eyebrow">Not signed in</p>
                <h2>Sign in to check your access.</h2>
                <p>
                  Log in with Patreon to see your membership status, tier and download
                  access. We never see your payment details.
                </p>
                <ul className="account-guest-list">
                  <li><Check size={15} /> Verify your current Patreon tier</li>
                  <li><Check size={15} /> Basic Access from {BASIC_PRICE_LABEL}</li>
                  <li><Check size={15} /> Full Access {FULL_PRICE_LABEL} for the complete library</li>
                </ul>
                <button type="button" className="btn btn--patreon btn--lg" onClick={handleLogin}>
                  <PatreonMark size={20} /> Log in with Patreon
                </button>
                <Link to="/newest" className="link-arrow">
                  Browse the preview library <ArrowRight size={15} />
                </Link>
              </div>
              <div className="account-guest-art" aria-hidden="true">
                <img src={POSTER_IMAGES[3]} alt="" />
                <span className="account-guest-badge"><ShieldCheck size={22} /></span>
              </div>
            </div>
          ) : (
            <>
              <div className="account-main">
                <div className={`account-card${isPatron ? " is-active" : " is-inactive"}`}>
                  <div className="account-card-glow" aria-hidden="true" />
                  <div className="account-identity">
                    <div className="account-avatar">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" />
                      ) : (
                        <span className="account-avatar-initials">{initials}</span>
                      )}
                      <span className={`account-avatar-dot${isPatron ? " is-active" : ""}`} />
                    </div>
                    <div>
                      <h2>{profile.full_name || "Patron"}</h2>
                      <p>{profile.email}</p>
                      <StatusPill status={profile.membership_status} />
                    </div>
                  </div>

                  <div className="account-status">
                    <span className={`account-status-icon${isPatron ? " is-active" : ""}`}>
                      {isPatron ? <Check size={22} /> : <X size={22} />}
                    </span>
                    <div>
                      <h3>
                        {isFullAccess
                          ? "Full Access is active."
                          : isBasic
                            ? "Basic Access is active."
                            : "Access is locked."}
                      </h3>
                      <p>
                        {isFullAccess
                          ? "Your Patreon entitlement is verified. Every Basic and Full Access release is unlocked."
                          : isBasic
                            ? "Your Basic Access entitlement is verified. Your Basic collection is unlocked; Full Access releases require an upgrade."
                            : "We couldn't verify an active membership tier. Update your pledge, then re-check your membership."}
                      </p>
                    </div>
                  </div>

                  <div className="account-details">
                    <div>
                      <span><ShieldCheck size={14} /> Membership status</span>
                      <strong>{profile.membership_status === "active" ? "Active" : profile.membership_status === "inactive" ? "Inactive" : "Unverified"}</strong>
                    </div>
                    <div>
                      <span><Sparkles size={14} /> Access level</span>
                      <strong>{accessLabel(accessLevel)}</strong>
                    </div>
                    <div>
                      <span><Sparkles size={14} /> Entitled tier</span>
                      <strong>
                        {profile.membership_status === "active" && profile.entitled_tier_ids.length
                          ? profile.entitled_tier_ids.join(", ")
                          : "No active entitlement"}
                      </strong>
                    </div>
                    <div>
                      <span><CreditCard size={14} /> Pledge</span>
                      <strong>
                        {profile.pledge_amount_cents
                          ? `$${(profile.pledge_amount_cents / 100).toFixed(2)}`
                          : "No active pledge"}
                      </strong>
                    </div>
                    <div>
                      <span><PatreonMark size={14} /> Patreon ID</span>
                      <strong>{profile.patreon_user_id || "—"}</strong>
                    </div>
                    <div>
                      <span><CalendarDays size={14} /> Member since</span>
                      <strong>{formatDate(profile.created_at)}</strong>
                    </div>
                    <div>
                      <span><RefreshCw size={14} /> Last verified</span>
                      <strong>{formatDate(profile.last_synced_at)}</strong>
                    </div>
                  </div>

                  <div className="account-actions">
                    {isBasic && (
                      <a
                        className="btn btn--primary"
                        href={PATREON_PAGE_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <ExternalLink size={16} /> {UPGRADE_CTA_LABEL}
                      </a>
                    )}
                    {isFullAccess && (
                      <Link to="/newest" className="btn btn--primary">
                        <Sparkles size={16} /> Open the library
                      </Link>
                    )}
                    {!isPatron && (
                      <a
                        className="btn btn--primary"
                        href={PATREON_PAGE_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <ExternalLink size={16} /> Update pledge on Patreon
                      </a>
                    )}
                    {isBasic && (
                      <Link to="/newest" className="btn btn--ghost">
                        <Sparkles size={16} /> Open Basic library
                      </Link>
                    )}
                    <a
                      className="btn btn--ghost"
                      href={PATREON_PAGE_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <PatreonMark size={16} /> Manage on Patreon
                    </a>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => void handleRefresh()}
                      disabled={refreshing}
                    >
                      <RefreshCw size={16} className={refreshing ? "spin" : ""} /> Refresh status
                    </button>
                  </div>
                </div>

                <PatreonConnectionCard />

                <div className="account-secondary">
                  <div className="account-info-card">
                    <span className="account-info-icon"><ShieldCheck size={20} /></span>
                    <h3>Your access is verified server-side.</h3>
                    <p>
                      Every media URL is minted on demand by a Supabase Edge Function after
                      it re-checks your Patreon entitlement. Signed links are short-lived and
                      never included in the public page.
                    </p>
                  </div>
                  <div className="account-info-card">
                    <span className="account-info-icon"><CreditCard size={20} /></span>
                    <h3>Billing stays with Patreon.</h3>
                    <p>
                      We never store card details. Change your tier, update payment methods
                      or cancel directly in Patreon. Your status syncs back through webhooks.
                    </p>
                    <a
                      href={PATREON_PAGE_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link-arrow"
                    >
                      Open Patreon <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {demoMode && (
                  <div className="demo-panel">
                    <div>
                      <p className="eyebrow">Demo controls</p>
                      <h3>Test the membership gates.</h3>
                      <p>
                        Supabase isn&apos;t connected, so this panel lets you test Basic
                        Access, Full Access and the inactive state locally.
                      </p>
                    </div>
                    <div className="demo-panel-actions">
                      <button
                        type="button"
                        className={`btn btn--sm ${isBasic ? "btn--primary" : "btn--ghost"}`}
                        onClick={() => {
                          setDemoTier("basic");
                          toast("Demo member now has Basic Access.", "success");
                        }}
                      >
                        <Check size={15} /> Basic Access
                      </button>
                      <button
                        type="button"
                        className={`btn btn--sm ${isFullAccess ? "btn--primary" : "btn--ghost"}`}
                        onClick={() => {
                          setDemoTier("full");
                          toast("Demo member now has Full Access.", "success");
                        }}
                      >
                        <Check size={15} /> Full Access
                      </button>
                      <button
                        type="button"
                        className={`btn btn--sm ${!isPatron ? "btn--danger" : "btn--ghost"}`}
                        onClick={() => {
                          setDemoMembership("inactive");
                          toast("Demo member is now inactive. Content restricted.", "error");
                        }}
                      >
                        <X size={15} /> Inactive
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          resetAgeGate();
                          toast("Age gate reset. Reloading…");
                          window.setTimeout(() => window.location.reload(), 500);
                        }}
                      >
                        Reset age gate
                      </button>
                    </div>
                  </div>
                )}

                <div className="account-footer-actions">
                  {isAdmin && (
                    <Link to="/admin" className="btn btn--ghost btn--sm">
                      <LayoutDashboard size={15} /> Admin dashboard
                    </Link>
                  )}
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => void handleLogout()}>
                    <LogOut size={15} /> Log out
                  </button>
                  <button type="button" className="account-switch" onClick={() => openAuthModal("account")}>
                    Signed in with the wrong account?
                  </button>
                </div>
              </div>

              <aside className="account-aside">
                <div className="account-aside-card">
                  <p className="eyebrow">Membership</p>
                  <div className="account-aside-price">
                    <span>From {BASIC_PRICE_LABEL}</span>
                  </div>
                  <p className="account-aside-copy">
                    Basic Access from {BASIC_PRICE_LABEL}. Full Access {FULL_PRICE_LABEL} for
                    the complete Jerryhub library.
                  </p>
                  <ul>
                    <li><Check size={14} /> Basic Access collection</li>
                    <li><Check size={14} /> Full Access: everything in Basic</li>
                    <li><Check size={14} /> All premium animation, art, games &amp; comics</li>
                    <li><Check size={14} /> Offline downloads</li>
                  </ul>
                  <a
                    href={PATREON_PAGE_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn--patreon btn--sm btn--block"
                  >
                    <PatreonMark size={16} /> View on Patreon
                  </a>
                </div>
                <div className="account-aside-card account-aside-card--muted">
                  <p className="eyebrow">Need help?</p>
                  <h3>Access not updating?</h3>
                  <p>
                    Patreon webhooks usually update your status within a minute. If it&apos;s
                    been longer, refresh the status or contact support.
                  </p>
                  <Link to="/legal/contact" className="link-arrow">
                    Contact support <ArrowRight size={14} />
                  </Link>
                </div>
              </aside>
            </>
          )}
        </div>
      </section>
    </>
  );
}
