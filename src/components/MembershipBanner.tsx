import { AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PATREON_PAGE_URL } from "../lib/config";

export function MembershipBanner() {
  const { profile, isPatron } = useAuth();
  if (!profile || isPatron) return null;

  return (
    <div className="membership-banner-wrap">
      <div className="container">
        <div className="membership-banner" role="status">
          <span className="membership-banner-icon"><ShieldAlert size={20} /></span>
          <div>
            <strong>Your Patreon membership is inactive.</strong>
            <p>Update your pledge to regain access.</p>
          </div>
          <a
            className="btn btn--primary btn--sm"
            href={PATREON_PAGE_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            Update pledge <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <AlertTriangle size={18} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
