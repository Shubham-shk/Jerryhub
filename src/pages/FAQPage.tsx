import { Link } from "react-router-dom";
import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import { FAQAccordion } from "../components/landing/FAQAccordion";
import { MembershipBanner } from "../components/MembershipBanner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function FAQPage() {
  useDocumentTitle("FAQ");
  return (
    <>
      <section className="page-hero page-hero--faq">
        <div className="container page-hero-inner">
          <p className="eyebrow">Answers, quickly</p>
          <h1>Frequently asked questions</h1>
          <p>
            Access, billing, downloads and the library — all the details. If your question
            isn&apos;t here, support is one message away.
          </p>
          <div className="page-hero-actions">
            <Link to="/legal/contact" className="btn btn--primary">
              <MessageCircleQuestion size={17} /> Contact support
            </Link>
            <Link to="/newest" className="link-arrow">
              Browse the library <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <MembershipBanner />

      <section className="section">
        <div className="container faq-page-layout">
          <aside className="faq-page-aside">
            <p className="eyebrow">Quick facts</p>
            <div className="quick-facts">
              <div><strong>From $5</strong><span>per month</span></div>
              <div><strong>2 plans</strong><span>Basic &amp; Full</span></div>
              <div><strong>Daily</strong><span>new drops</span></div>
              <div><strong>2K</strong><span>quality</span></div>
            </div>
            <p className="faq-aside-note">
              Access is verified through Patreon on every request. No payment details ever
              touch this site.
            </p>
          </aside>
          <FAQAccordion />
        </div>
      </section>
    </>
  );
}
