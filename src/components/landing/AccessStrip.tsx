import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  BASIC_PRICE_LABEL,
  FULL_PRICE_LABEL,
  PATREON_PAGE_URL,
} from "../../lib/config";
import { PatreonMark } from "../PatreonMark";

export function AccessStrip() {
  const { isPatron, profile } = useAuth();

  return (
    <div className="access-strip">
      <div className="access-strip-glow" aria-hidden="true" />
      <span className="access-strip-icon" aria-hidden="true">
        <Sparkles size={18} />
      </span>
      <div className="access-strip-copy">
        <p>
          Premium entertainment starts at <strong>{BASIC_PRICE_LABEL}</strong>.
        </p>
        <span>
          Basic Access from {BASIC_PRICE_LABEL} · Full Access {FULL_PRICE_LABEL} for the
          complete Jerryhub library.
        </span>
      </div>
      <div className="access-strip-actions">
        {isPatron ? (
          <Link to="/newest" className="btn btn--primary access-strip-btn">
            Open library <ArrowRight size={15} />
          </Link>
        ) : (
          <>
            <a
              className="btn btn--patreon access-strip-btn"
              href={PATREON_PAGE_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              <PatreonMark size={16} /> Join on Patreon
              <ExternalLink size={13} />
            </a>
            {!profile && (
              <a href="#pricing" className="btn btn--ghost access-strip-btn">
                Compare packs
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
