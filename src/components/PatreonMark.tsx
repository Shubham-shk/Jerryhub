export function PatreonMark({ size = 18 }: { size?: number }) {
  return (
    <span
      className="patreon-mark"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.62) }}
      aria-hidden="true"
    >
      P
    </span>
  );
}
