export function MediaCardSkeleton() {
  return (
    <div className="poster-card poster-card--skeleton" aria-hidden="true">
      <div className="poster-art">
        <div className="poster-frame skeleton" />
      </div>
      <div className="poster-info">
        <div className="skeleton skeleton-line skeleton-line--lg" />
        <div className="skeleton skeleton-line skeleton-line--sm" />
      </div>
    </div>
  );
}

export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="poster-track poster-track--skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <MediaCardSkeleton key={index} />
      ))}
    </div>
  );
}
