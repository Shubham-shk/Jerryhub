import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Check, ExternalLink, ShieldAlert, Sparkles, UserCheck, X } from "lucide-react";
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
  "Streaming and downloads for Basic content",
];

const fullPerks = [
  "Everything included in Basic Access",
  "All premium animation collections",
  "All eligible videos, artwork, games, manga & comics",
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

  return (
    <div className="modal-backdrop" onMouseDown={closeAuthModal}>
      <div
        className="modal auth-modal"
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

        <p className="eyebrow">
          {inactive
            ? "Membership check"
            : admin
              ? "Restricted area"
              : upgrade
                ? "Upgrade your membership"
                : "Members only"}
        </p>
        <h2 id="auth-modal-title">
          {inactive
            ? "Your Patreon membership is inactive."
            : admin
              ? "Admin access only."
              : upgrade
                ? `Upgrade to Full Access — ${FULL_PRICE_LABEL}`
                : "Unlock the Jerryhub library."}
        </h2>

        <p className="auth-modal-copy">
          {inactive
            ? "Update your pledge to regain access. We re-check your entitlement with Patreon every time you sign in, and webhooks keep your status in sync in real time."
            : admin
              ? "This dashboard is limited to the site owner. Sign in with the admin Patreon account to continue."
              : upgrade
                ? "This release is included with Full Access. Your Basic Access membership is active — upgrade to Full Access to unlock the complete Jerryhub library."
                : `This release is reserved for Jerryhub members. Choose Basic Access from ${BASIC_PRICE_LABEL} or unlock everything with Full Access at ${FULL_PRICE_LABEL}.`}
        </p>

        {!inactive && !admin && (
          <ul className="auth-modal-perks">
            {(upgrade || !isBasic ? fullPerks : basicPerks).map((perk) => (
              <li key={perk}>
                <Check size={15} /> {perk}
              </li>
            ))}
          </ul>
        )}

        {inactive ? (
          <div className="auth-modal-actions">
            <a
              className="btn btn--primary btn--block"
              href={PATREON_PAGE_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink size={17} /> Update pledge on Patreon
            </a>
            <button type="button" className="btn btn--ghost btn--block" onClick={handleSwitchAccount}>
              Sign in with a different account
            </button>
            {profile?.email && (
              <p className="auth-modal-fineprint">Signed in as {profile.email}</p>
            )}
          </div>
        ) : upgrade ? (
          <div className="auth-modal-actions">
            <a
              className="btn btn--primary btn--block"
              href={PATREON_PAGE_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink size={17} /> {UPGRADE_CTA_LABEL}
            </a>
            <a className="auth-modal-link" href="/#pricing">
              Compare membership plans <ExternalLink size={13} />
            </a>
            {profile?.email && (
              <p className="auth-modal-fineprint">Signed in as {profile.email}</p>
            )}
          </div>
        ) : (
          <div className="auth-modal-actions">
            <button type="button" className="btn btn--patreon btn--lg btn--block" onClick={handleLogin}>
              <PatreonMark size={20} /> Continue with Patreon
            </button>
            <p className="auth-modal-price">
              Memberships start at <strong>{BASIC_PRICE_LABEL}</strong>. Basic Access{" "}
              {BASIC_PRICE_LABEL} · Full Access {FULL_PRICE_LABEL}. Active Patreon
              membership required.
            </p>
            {!admin && (
              <a
                className="auth-modal-link"
                href={PATREON_PAGE_URL}
                target="_blank"
                rel="noreferrer noopener"
              >
                Not a member yet? Join on Patreon <ExternalLink size={13} />
              </a>
            )}
            {demoMode && (
              <p className="demo-note">
                <strong>Demo mode.</strong> Supabase isn&apos;t configured, so this button
                signs you in locally as a verified Full Access member.
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
