import { HUB_POSTER_FILES } from "../../data/posters";

interface PosterMarqueeProps {
  paused?: boolean;
}

/**
 * Full-bleed A4 poster wall that drifts right-to-left behind the hero copy.
 * The list is rendered twice so the -50% translate loops seamlessly.
 */
export function PosterMarquee({ paused = false }: PosterMarqueeProps) {
  return (
    <div className="hero-marquee" aria-hidden="true">
      <div className="hero-marquee-track" data-paused={paused}>
        {[0, 1].map((group) => (
          <div className="hero-marquee-group" key={group}>
            {HUB_POSTER_FILES.map((src, index) => (
              <div className="hero-marquee-panel" key={`${group}-${index}`}>
                <img
                  src={src}
                  alt=""
                  loading={group === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
