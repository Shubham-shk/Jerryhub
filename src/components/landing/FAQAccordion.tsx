import { useState } from "react";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { faqItems } from "../../data/faq";

export function FAQAccordion({ limit }: { limit?: number }) {
  const [open, setOpen] = useState<number | null>(0);
  const items = typeof limit === "number" ? faqItems.slice(0, limit) : faqItems;

  return (
    <div className="faq-accordion">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div className={`faq-item${isOpen ? " is-open" : ""}`} key={item.question}>
            <button
              type="button"
              className="faq-question"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${index}`}
              onClick={() => setOpen(isOpen ? null : index)}
            >
              <span>{item.question}</span>
              <span className="faq-chevron"><ChevronDown size={18} /></span>
            </button>
            <div className="faq-answer" id={`faq-panel-${index}`} role="region">
              <div className="faq-answer-inner">
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}

      <div className="faq-contact">
        <span className="faq-contact-icon"><MessageCircleQuestion size={19} /></span>
        <div>
          <strong>Still have a question?</strong>
          <p>We usually reply within one business day.</p>
        </div>
        <Link to="/legal/contact" className="btn btn--primary btn--sm">Contact support</Link>
      </div>
    </div>
  );
}
