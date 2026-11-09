import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LogOut, ShieldAlert } from "lucide-react";
import { useAgeGate, detectRegion } from "../context/AgeGateContext";
import { BRAND_NAME } from "../lib/config";
import { Logo } from "./Logo";

const collage = [1, 2, 3, 4, 5, 6].map(
  (n) => `/posters/portrait-${String(n).padStart(2, "0")}.svg`,
);

export function AgeGate() {
  const { verified, accept } = useAgeGate();

  useEffect(() => {
    if (verified) return;
    document.body.classList.add("no-scroll");
    document.title = `${BRAND_NAME} — 18+ age verification`;
    return () => document.body.classList.remove("no-scroll");
  }, [verified]);

  if (verified) return null;

  return (
    <div className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="age-gate-bg" aria-hidden="true">
        {collage.map((src, index) => (
          <img key={src} src={src} alt="" style={{ animationDelay: `${index * 0.6}s` }} />
        ))}
      </div>
      <div className="age-gate-overlay" aria-hidden="true" />

      <div className="age-gate-card">
        <div className="age-gate-top">
          <Logo />
          <span className="age-gate-18">18+</span>
        </div>

        <div className="age-gate-icon" aria-hidden="true">
          <ShieldAlert size={30} />
        </div>

        <h1 id="age-gate-title">Adults only beyond this point.</h1>
        <p className="age-gate-copy">
          {BRAND_NAME} contains adult animation and explicit content intended for
          consenting adults. By entering, you confirm that you are at least 18 years old
          and that viewing adult material is legal where you live.
        </p>

        <div className="age-gate-location">
          <span className="age-gate-location-dot" aria-hidden="true" />
          <span>
            We detected you are visiting from <strong>{detectRegion()}</strong>.
          </span>
        </div>

        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={accept}>
          I am 18 or older — Enter <ArrowRight size={18} />
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--block age-gate-leave"
          onClick={() => window.location.assign("https://www.google.com")}
        >
          <LogOut size={16} /> Leave site
        </button>

        <p className="age-gate-fineprint">
          By entering you agree to our{" "}
          <Link to="/legal/terms">Terms</Link> and{" "}
          <Link to="/legal/privacy">Privacy Policy</Link>. Your choice is stored locally on
          this device.
        </p>
      </div>
    </div>
  );
}
