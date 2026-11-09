import { Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { useNavigate } from "react-router-dom";
import { BASIC_PRICE_LABEL, FULL_PRICE_LABEL } from "../../lib/config";

export function FinalCTA() {
  const { isPatron, login, demoMode } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();

  async function handleAccess() {
    if (isPatron) {
      navigate("/newest");
      return;
    }
    sessionStorage.setItem("lhh_post_login_path", "/newest");
    await login();
    if (demoMode) {
      toast("Demo mode: access granted.", "success");
      navigate("/newest");
    }
  }

  return (
    <section className="section final-cta-section">
      <div className="container">
        <div className="final-cta">
          <div className="final-cta-glow" aria-hidden="true" />
          <div className="final-cta-grid" aria-hidden="true" />
          <p className="eyebrow">Your next obsession is one click away</p>
          <h2>
            Stop scrolling.<br />
            <span className="text-gradient">Start watching.</span>
          </h2>
          <p>
            Premium entertainment starts at {BASIC_PRICE_LABEL}. Choose Basic Access or
            unlock the complete Jerryhub library with Full Access at {FULL_PRICE_LABEL}.
          </p>
          <button type="button" className="btn btn--primary btn--lg" onClick={handleAccess}>
            <Sparkles size={19} /> {isPatron ? "Open the library" : "Explore memberships"}
          </button>
          <span className="final-cta-note">18+ · Patreon verified · No ads, ever</span>
        </div>
      </div>
    </section>
  );
}
