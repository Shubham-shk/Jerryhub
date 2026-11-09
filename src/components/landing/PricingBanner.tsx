import { Check, ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import {
  BASIC_CTA_LABEL,
  BASIC_PRICE_LABEL,
  FULL_CTA_LABEL,
  FULL_PRICE_LABEL,
  PATREON_PAGE_URL,
} from "../../lib/config";
import type { MembershipTier } from "../../lib/types";

const basicIncludes = [
  "Entry-level premium collection",
  "Basic member-exclusive content",
  "Streaming and downloads for Basic content",
  "Cancel or change tier anytime",
];

const fullIncludes = [
  "Everything included in Basic Access",
  "All premium animation collections",
  "All eligible videos, artwork, 2D games, manga & comics",
  "Every future Full Access drop",
];

export function PricingBanner() {
  const { isFullAccess, profile, login, demoMode } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();

  async function handlePlan(tier: MembershipTier) {
    if (isFullAccess) {
      navigate("/newest");
      return;
    }
    if (profile) {
      window.open(PATREON_PAGE_URL, "_blank", "noopener,noreferrer");
      return;
    }
    sessionStorage.setItem("lhh_post_login_path", "/newest");
    await login();
    if (demoMode) {
      toast(
        `Demo mode: ${tier === "basic" ? "Basic Access" : "Full Access"} enabled.`,
        "success",
      );
    }
  }

  return (
    <section className="pricing-section" id="pricing">
      <div className="container">
        <div className="pricing-head">
          <p className="eyebrow">Membership</p>
          <h2>
            Get Access Starting From{" "}
            <span className="text-gradient">{BASIC_PRICE_LABEL}</span>
          </h2>
          <p>
            Choose the membership that works for you. Start with our entry-level plan or
            unlock the complete Jerryhub experience with full access to all available
            content.
          </p>
        </div>

        <div className="pricing-grid">
          <article className="pricing-card">
            <div className="pricing-plan-head">
              <div>
                <p className="pricing-plan-name">Basic Access</p>
                <p className="pricing-plan-sub">Entry-level membership</p>
              </div>
            </div>

            <div className="pricing-price-row">
              <span className="pricing-price-value">From {BASIC_PRICE_LABEL}</span>
              <span className="pricing-price-suffix">/month</span>
            </div>
            <p className="pricing-plan-desc">
              Get started with Jerryhub and explore our entry-level premium collection.
            </p>

            <ul className="pricing-benefits">
              {basicIncludes.map((item) => (
                <li key={item}>
                  <Check size={15} /> {item}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={() => void handlePlan("basic")}
            >
              <Sparkles size={17} /> {BASIC_CTA_LABEL}
            </button>
          </article>

          <article className="pricing-card pricing-card--featured">
            <span className="pricing-recommended">Recommended</span>
            <div className="pricing-plan-head">
              <div>
                <p className="pricing-plan-name">Full Access</p>
                <p className="pricing-plan-sub">The complete Jerryhub experience</p>
              </div>
            </div>

            <div className="pricing-price-row">
              <span className="pricing-price-value">{FULL_PRICE_LABEL}</span>
              <span className="pricing-price-suffix">/month</span>
            </div>
            <p className="pricing-plan-desc">
              Unlock the complete Jerryhub experience with access to all available premium
              content.
            </p>

            <ul className="pricing-benefits">
              {fullIncludes.map((item) => (
                <li key={item}>
                  <Check size={15} /> {item}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => void handlePlan("full")}
            >
              <Sparkles size={17} /> {FULL_CTA_LABEL}
            </button>
          </article>
        </div>

        <p className="pricing-footnote">
          Billing, upgrades, downgrades and cancellations are handled securely by Patreon.
          Access is verified from your current entitled tier.{" "}
          <a href={PATREON_PAGE_URL} target="_blank" rel="noreferrer noopener">
            View memberships on Patreon <ExternalLink size={11} />
          </a>
        </p>
      </div>
    </section>
  );
}
