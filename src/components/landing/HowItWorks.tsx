import { ArrowRight, CreditCard, ShieldCheck, Sparkles } from "lucide-react";

const steps = [
  {
    icon: CreditCard,
    number: "01",
    title: "Join on Patreon",
    copy: "Choose Basic Access from $5 or Full Access at $9.50. Billing, receipts and cancellations all stay inside Patreon.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "Verify instantly",
    copy: "Authorise once. We check your current entitled tier server-side — no passwords, no card data.",
  },
  {
    icon: Sparkles,
    number: "03",
    title: "Start streaming",
    copy: "Access is recalculated from your verified tier. Basic unlocks its collection; Full opens the complete library.",
  },
];

export function HowItWorks() {
  return (
    <section className="section how-section">
      <div className="container">
        <div className="how-head">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title">In. Verified. Watching.</h2>
          <p className="section-description">Three steps, about sixty seconds.</p>
        </div>
        <div className="how-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div className="how-step" key={step.number}>
                <span className="how-number">{step.number}</span>
                <span className="how-icon"><Icon size={22} /></span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                {index < steps.length - 1 && <ArrowRight className="how-arrow" size={18} />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
