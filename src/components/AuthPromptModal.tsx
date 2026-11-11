import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Check,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import {
  BASIC_PRICE_LABEL,
  FULL_PRICE_LABEL,
  PATREON_PAGE_URL,
  UPGRADE_CTA_LABEL,
} from "../lib/config";
import { PatreonMark } from "./PatreonMark";
import { Logo } from "./Logo";

const basicPerks = [
  "Entry-level premium collection",
  "Basic member-exclusive content",
  "Streaming and downloads",
];

const fullPerks = [
  "Everything in Basic Access",
  "All animation, games, manga & art",
  "Every future Full Access drop",
];

export function AuthPromptModal() {
  const { authModalOpen, authModalReason, closeAuthModal, toast } = useUI();
  const { login, logout, profile, demoMode, isBasic } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authModalOpen) return;
    document.body.classList.add("no-scroll");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAuthModal();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("no-scroll");
      document.removeEventListener("keydown", onKey);
    };
  }, [authModalOpen, closeAuthModal]);

  if (!authModalOpen) return null;

  const inactive = authModalReason === "inactive";
  const admin = authModalReason === "admin";
  const upgrade = authModalReason === "upgrade";
  const purchase = authModalReason === "purchase";
  const needsLogin = !profile;

  async function handleLogin() {
    sessionStorage.setItem("lhh_post_login_path", location.pathname);
    await login();
    if (demoMode) {
      closeAuthModal();
      toast("Demo mode: signed in as a verified member.", "success");
    }
  }

  async function handleSwitchAccount() {
    await logout();
    await handleLogin();
  }

  const eyebrow = admin
    ? "Restricted area"
    : inactive
      ? "Membership check"
      : upgrade
        ? "Upgrade your membership"
        : purchase
          ? "Choose your pack"
          : "Members only";

  const title = admin
    ? "Admin access only."
    : inactive
      ? "Your Patreon membership is inactive."
      : upgrade
        ? `Unlock everything with Full Access — ${FULL_PRICE_LABEL}`
        : purchase
          ? "Pick your membership pack."
          : "Unlock the Jerryhub library.";

  const copy = admin
    ? "This dashboard is limited to the site owner. Sign in with the admin Patreon account to continue."
    : inactive
      ? "Reactivate your pledge to regain access. We re-check your entitlement with Patreon every time you sign in, and webhooks keep your status in sync in real time."
      : upgrade
        ? "This release is included with Full Access. Your Basic Access membership is active — upgrade to unlock the complete Jerryhub library."
        : purchase
          ? "Every pack unlocks the private vault instantly. Full Access is our best seller and includes everything we release."
          : `This release is reserved for Jerryhub members. Connect your Patreon account to verify your tier, or choose a pack to get started from ${BASIC_PRICE_LABEL}/mo.`;

  return (
    <div className="modal-backdrop" onMouseDown={closeAuthModal}>
      <div
        className={`modal auth-modal${admin ? "" : " auth-modal--plans"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Close" onClick={closeAuthModal}>
          <X size={18} />
        </button>

        <Logo variant="login" />

        <div className={`auth-modal-icon${inactive ? " is-warning" : ""}`}>
          {inactive ? (
            <ShieldAlert size={28} />
          ) : admin ? (
            <UserCheck size={28} />
          ) : (
            <Sparkles size={28} />
          )}
        </div>

        <p className="eyebrow">{eyebrow}</p>
        <h2 id="auth-modal-title">{title}</h2>

        <p className="auth-modal-copy">{copy}</p>

        {!admin && (
          <div className="auth-plan-grid">
            <article className="auth-plan">
              <p className="auth-plan-name">Basic Access</p>
              <p className="auth-plan-price">
                {BASIC_PRICE_LABEL}
                <span>/mo</span>
              </p>
              <ul className="auth-plan-list">
                {basicPerks.map((perk) => (
                  <li key={perk}>
                    <Check size={13} /> {perk}
                  </li>
                ))}
              </ul>
            </article>

            <article className="auth-plan auth-plan--best">
              <span className="auth-plan-best">Best Seller</span>
              <p className="auth-plan-name">Full Access</p>
              <p className="auth-plan-price">
                {FULL_PRICE_LABEL}
                <span>/mo</span>
              </p>
              <ul className="auth-plan-list">
                {fullPerks.map((perk) => (
                  <li key={perk}>
                    <Check size={13} /> {perk}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        )}

        {admin ? (
          <div className="auth-modal-actions">
            <button type="button" className="btn btn--patreon btn--lg btn--block" onClick={handleLogin}>
              <PatreonMark size={20} /> Continue with Patreon
            </button>
          </div>
        ) : needsLogin ? (
          <div className="auth-modal-actions">
            <button type="button" className="btn btn--patreon btn--lg btn--block" onClick={handleLogin}>
              <PatreonMark size={20} /> Continue with Patreon
            </button>
            <a
              className="btn btn--ghost btn--block"
              href={PATREON_PAGE_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink size={16} /> Join on Patreon
            </a>
            <p className="auth-modal-price">
              Memberships start at <strong>{BASIC_PRICE_LABEL}</strong>. Full Access{" "}
              <strong>{FULL_PRICE_LABEL}</strong> is the best seller. Active Patreon membership
              required.
            </p>
            {demoMode && (
              <p className="demo-note">
                <strong>Demo mode.</strong> Supabase isn&apos;t configured, so this button
                signs you in locally as a verified Full Access member.
              </p>
            )}
          </div>
        ) : (
          <div className="auth-modal-actions">
            <a
              className="btn btn--patreon btn--lg btn--block"
              href={PATREON_PAGE_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              <PatreonMark size={20} />
              {inactive
                ? "Reactivate on Patreon"
                : upgrade
                  ? UPGRADE_CTA_LABEL
                  : `Join on Patreon — ${FULL_PRICE_LABEL}`}
            </a>
            <button type="button" className="btn btn--ghost btn--block" onClick={handleSwitchAccount}>
              Sign in with a different account
            </button>
            {profile?.email && (
              <p className="auth-modal-fineprint">Signed in as {profile.email}</p>
            )}
            {isBasic && !upgrade && (
              <p className="auth-modal-price">
                You&apos;re on Basic Access. Upgrade to Full Access at{" "}
                <strong>{FULL_PRICE_LABEL}</strong> for everything.
              </p>
            )}
          </div>
        )}

        <p className="auth-modal-legal">
          By continuing you agree to our Terms. We never see or store your payment details.
        </p>
      </div>
    </div>
  );
}
