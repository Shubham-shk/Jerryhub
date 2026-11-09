import { useId } from "react";
import { Link } from "react-router-dom";

export type LogoVariant = "nav" | "footer" | "login" | "loading" | "mobile";

/**
 * Jerryhub wordmark.
 *
 * The mark is a bold "J" monogram inside a tilted, gradient-lit tile. The
 * wordmark pairs a comic-display "JERRY" with a gradient "HUB" badge, so the
 * identity still reads at 24px in the navigation and at 96px on the login
 * screen.
 */
export function Logo({
  variant = "nav",
  compact = false,
}: {
  variant?: LogoVariant;
  compact?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `jh-grad-${uid}`;
  const shineId = `jh-shine-${uid}`;

  return (
    <Link
      to="/"
      className={`jh-logo jh-logo--${variant}${compact ? " jh-logo--compact" : ""}`}
      aria-label="Jerryhub home"
    >
      <span className="jh-logo-mark" aria-hidden="true">
        <span className="jh-logo-mark-glow" />
        <svg viewBox="0 0 44 44" width="100%" height="100%" fill="none" className="jh-logo-svg">
          <defs>
            <linearGradient id={gradId} x1="6" y1="4" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff2d78" />
              <stop offset="0.55" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id={shineId} x1="12" y1="8" x2="30" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect x="2" y="2" width="40" height="40" rx="12" fill="#0a0a10" />
          <rect
            x="2.75"
            y="2.75"
            width="38.5"
            height="38.5"
            rx="11.4"
            stroke={`url(#${gradId})`}
            strokeWidth="1.5"
            opacity="0.9"
          />
          <path
            d="M27.4 9.5v16.8c0 5.1-3.3 8.2-8.1 8.2-4.3 0-7.2-2.3-8.1-6.1l5.1-1.4c.4 1.8 1.4 2.8 3 2.8 1.8 0 2.8-1.2 2.8-3.5V9.5h5.3Z"
            fill={`url(#${gradId})`}
          />
          <path
            d="M15.2 12.4 19 8.6"
            stroke={`url(#${shineId})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="33" cy="11" r="1.5" fill="#ffffff" opacity="0.9" />
        </svg>
      </span>

      {!compact && (
        <span className="jh-logo-word">
          <span className="jh-logo-jerry">JERRY</span>
          <span className="jh-logo-hub">HUB</span>
        </span>
      )}

      {variant === "footer" && !compact && (
        <span className="jh-logo-tag">Premium Anime Entertainment</span>
      )}
    </Link>
  );
}
