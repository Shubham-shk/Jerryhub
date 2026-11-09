import { Link } from "react-router-dom";
import { Heart, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "./Logo";
import { PatreonMark } from "./PatreonMark";
import {
  BASIC_PRICE_LABEL,
  BRAND_NAME,
  FULL_PRICE_LABEL,
  PATREON_PAGE_URL,
} from "../lib/config";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo variant="footer" />
          <p>
            A premium entertainment club for anime, interactive experiences and
            illustrated stories. Explore memberships starting from {BASIC_PRICE_LABEL}.
          </p>
          <div className="footer-badges">
            <span className="footer-badge"><ShieldCheck size={13} /> Patreon verified</span>
            <span className="footer-badge"><Sparkles size={13} /> Private archive</span>
          </div>
        </div>

        <div className="footer-col">
          <h4>Explore</h4>
          <Link to="/">Home</Link>
          <Link to="/trending">Trending</Link>
          <Link to="/newest">Newest uploads</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/account">My account</Link>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/legal/terms">Terms of service</Link>
          <Link to="/legal/privacy">Privacy policy</Link>
          <Link to="/legal/dmca">DMCA</Link>
          <Link to="/legal/contact">Contact</Link>
          <Link to="/legal/2257">18 U.S.C. 2257</Link>
        </div>

        <div className="footer-col footer-col--cta">
          <h4>Membership</h4>
          <p className="footer-price">
            <span>From {BASIC_PRICE_LABEL}</span>
          </p>
          <p className="footer-muted">
            Basic Access {BASIC_PRICE_LABEL} · Full Access {FULL_PRICE_LABEL}. Active
            Patreon membership required. Cancel anytime.
          </p>
          <a
            className="btn btn--patreon btn--sm btn--block"
            href={PATREON_PAGE_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <PatreonMark size={17} /> Join on Patreon
          </a>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
        <p className="footer-powered">
          Powered by <PatreonMark size={16} /> <strong>Patreon</strong>
        </p>
        <p className="footer-age"><span>18+</span> Adults only</p>
      </div>

      <div className="container footer-disclaimer">
        <p>
          This site contains adult content intended for consenting adults aged 18 or older.
          All performers and characters depicted are adults. Patreon is a trademark of
          Patreon, Inc. {BRAND_NAME} is an independent creator platform and is not
          endorsed by Patreon. <Heart size={12} /> Built for the community.
        </p>
      </div>
    </footer>
  );
}
