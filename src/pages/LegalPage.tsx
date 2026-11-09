import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useAgeGate } from "../context/AgeGateContext";

interface LegalContent {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string[] }>;
}

const content: Record<string, LegalContent> = {
  terms: {
    title: "Terms of service",
    intro:
      "By accessing Jerryhub you agree to these terms. If you do not agree, leave the site and do not use the service.",
    sections: [
      {
        heading: "1. Eligibility",
        body: [
          "You must be at least 18 years old and legally permitted to view explicit adult material in your jurisdiction. You must not access the site from a place where adult content is unlawful.",
          "Access is personal. You may not share your account, session, signed links or downloaded files with anyone else.",
        ],
      },
      {
        heading: "2. Membership & billing",
        body: [
          "Access requires an active Patreon membership at a tier mapped to Basic Access or Full Access. Billing, receipts, upgrades, downgrades and cancellations are handled entirely by Patreon.",
          "If your pledge becomes inactive, declined or changes tier, library access is recalculated from your current verified entitlement. Full Access is never granted from a previous higher tier alone.",
        ],
      },
      {
        heading: "3. Acceptable use",
        body: [
          "Do not scrape, mirror, re-upload or redistribute the library. Do not attempt to bypass access controls, share signed URLs or interfere with the service.",
          "We may suspend access for abuse, chargebacks, sharing or any attempt to compromise the platform.",
        ],
      },
      {
        heading: "4. Content & intellectual property",
        body: [
          "All media, artwork, stories, marks and site code are owned by Jerryhub or its licensors. You receive a limited, revocable, non-transferable licence to view and download content for personal use while your membership is active.",
          "All depicted performers and characters are adults. Content is fictional and intended for adult entertainment only.",
        ],
      },
      {
        heading: "5. Disclaimers",
        body: [
          "The service is provided 'as is'. We do not guarantee uninterrupted availability. To the maximum extent permitted by law, we are not liable for indirect or consequential losses arising from use of the site.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro:
      "We collect the minimum needed to verify your Patreon membership and deliver the library. We never see or store your card details.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Patreon user id, display name, avatar, email address, membership status, entitled tier ids, pledge amount and campaign id. We also store a Supabase user id and session metadata.",
          "We do not receive your payment card, billing address or Patreon password.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To authenticate you, verify entitlement, unlock content, issue short-lived signed media URLs, respond to support requests and keep the service secure.",
          "Aggregate, non-identifying analytics may be used to understand which content is popular. We do not sell personal data.",
        ],
      },
      {
        heading: "Storage & retention",
        body: [
          "Profile data is stored in Supabase with row-level security. Media files are stored in private object storage and are never publicly listable.",
          "We retain profile data while your account exists and for a reasonable period afterwards to meet legal and fraud-prevention obligations.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can request access, correction or deletion of your data by contacting support. Deleting your local account does not cancel your Patreon membership — manage that directly on Patreon.",
          "The age gate stores a consent flag in your browser's localStorage. Clear site data to reset it.",
        ],
      },
    ],
  },
  dmca: {
    title: "DMCA & takedown",
    intro:
      "We respect intellectual property rights and respond to valid notices under the Digital Millennium Copyright Act.",
    sections: [
      {
        heading: "Submitting a notice",
        body: [
          "Send a written notice to the contact address including: identification of the copyrighted work, the exact URL of the allegedly infringing material, your contact details, a good-faith statement, a statement under penalty of perjury that the information is accurate and you are authorised to act, and your physical or electronic signature.",
        ],
      },
      {
        heading: "Counter-notice",
        body: [
          "If you believe material was removed in error, you may submit a counter-notice with your contact details, identification of the removed material and its prior location, a statement of good faith and consent to jurisdiction.",
        ],
      },
      {
        heading: "Repeat infringement",
        body: [
          "Accounts that repeatedly upload or share infringing material may be terminated. All content on this platform is either original, licensed or used with permission.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact & support",
    intro:
      "Membership, access, billing or takedown questions — send us a message and we'll get back to you.",
    sections: [
      {
        heading: "Support",
        body: [
          "Email: support@jerryhub.app",
          "For membership issues, include the email connected to your Patreon account and the approximate date of your pledge. Never send card details or your Patreon password.",
        ],
      },
      {
        heading: "Billing",
        body: [
          "All billing is handled by Patreon. For charges, refunds, payment methods or cancellations, use the Patreon membership page first — it is the fastest route and the only place that can change billing.",
        ],
      },
      {
        heading: "Response time",
        body: [
          "We aim to reply within one business day. Takedown and legal notices are prioritised.",
        ],
      },
    ],
  },
  "2257": {
    title: "18 U.S.C. § 2257 statement",
    intro:
      "Jerryhub publishes adult animation and illustrated fiction. No real human performers are depicted in the animated or illustrated content.",
    sections: [
      {
        heading: "Record-keeping",
        body: [
          "To the extent any content depicts real human performers, the relevant records are maintained by the applicable producer and made available to authorised inspectors as required by 18 U.S.C. § 2257 and 28 C.F.R. Part 75.",
          "All characters depicted in animated or illustrated works are fictional adults aged 18 or older.",
        ],
      },
      {
        heading: "Custodian of records",
        body: [
          "Requests for records should be sent to legal@jerryhub.app with the subject line '2257 request' and the specific content URL.",
        ],
      },
    ],
  },
};

export function LegalPage() {
  const { slug = "terms" } = useParams();
  const page = content[slug] ?? content.terms;
  const { verified } = useAgeGate();
  useDocumentTitle(page.title);

  return (
    <>
      {!verified && (
        <div className="legal-gate-note">
          <div className="container legal-gate-note-inner">
            <ShieldAlert size={16} />
            <p>Legal pages are readable before age verification.</p>
            <Link to="/">
              Complete age check <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
      <section className="page-hero page-hero--legal">
        <div className="container page-hero-inner">
          <Link to="/" className="legal-back"><ArrowLeft size={15} /> Back to home</Link>
          <p className="eyebrow">Legal &amp; support</p>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
          <p className="legal-updated">Last updated: November 4, 2026</p>
        </div>
      </section>

      <section className="section legal-section">
        <div className="container legal-layout">
          <article className="legal-article">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
            {slug === "contact" && (
              <a className="btn btn--primary" href="mailto:support@jerryhub.app">
                <Mail size={17} /> Email support
              </a>
            )}
            <div className="legal-note">
              <ShieldCheck size={18} />
              <p>
                This is a demonstration document for the Jerryhub platform build.
                Replace it with counsel-reviewed terms before launch.
              </p>
            </div>
          </article>

          <aside className="legal-aside">
            <p className="eyebrow">Legal pages</p>
            {Object.entries(content).map(([key, item]) => (
              <Link key={key} to={`/legal/${key}`} className={key === slug ? "is-active" : ""}>
                {item.title}
              </Link>
            ))}
          </aside>
        </div>
      </section>
    </>
  );
}
