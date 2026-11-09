import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BASIC_PRICE_LABEL, FULL_PRICE_LABEL } from "../../lib/config";

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
      {isPatron ? (
        <Link to="/newest" className="btn btn--primary access-strip-btn">
          Open library <ArrowRight size={15} />
        </Link>
      ) : profile ? (
        <a href="#pricing" className="btn btn--primary access-strip-btn">
          Explore memberships <ArrowRight size={15} />
        </a>
      ) : (
        <a href="#pricing" className="btn btn--primary access-strip-btn">
          <Sparkles size={15} /> Explore memberships
        </a>
      )}
    </div>
  );
}
