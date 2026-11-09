import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="announcement">
      <div className="announcement-inner">
        <Sparkles size={14} className="announcement-icon" />
        <span>
          <strong>New drop:</strong> Midnight Velvet is live
        </span>
        <span className="announcement-divider" aria-hidden="true" />
        <Link to="/newest" className="announcement-link">
          Members only <ArrowRight size={13} />
        </Link>
      </div>
      <button
        type="button"
        className="announcement-close"
        aria-label="Dismiss announcement"
        onClick={() => setVisible(false)}
      >
        <X size={14} />
      </button>
    </div>
  );
}
