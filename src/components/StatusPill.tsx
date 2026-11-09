import type { MembershipStatus } from "../lib/types";

const labels: Record<MembershipStatus | "guest", string> = {
  active: "Active patron",
  inactive: "Inactive",
  unknown: "Unverified",
  guest: "Guest",
};

export function StatusPill({ status }: { status: MembershipStatus | "guest" }) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      <span className="status-pill-dot" aria-hidden="true" />
      {labels[status]}
    </span>
  );
}
