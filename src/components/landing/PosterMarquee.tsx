import { HUB_POSTER_FILES } from "../../data/posters";
import { useSiteAssets } from "../../context/SiteAssetsContext";

interface PosterMarqueeProps {
  paused?: boolean;
}

/**
 * Full-bleed A4 poster wall that drifts right-to-left behind the hero copy.
 * The list is rendered twice so the -50% translate loops seamlessly.
 */
export function PosterMarquee({ paused = false }: PosterMarqueeProps) {
  const { getImage } = useSiteAssets();

  return (
    <div className="hero-marquee" aria-hidden="true">
      <div className="hero-marquee-track" data-paused={paused}>
        {[0, 1].map((group) => (
          <div className="hero-marquee-group" key={group}>
            {HUB_POSTER_FILES.map((src, index) => {
              const image = getImage(`marquee-${String(index + 1).padStart(2, "0")}`, src);
              return (
                <div className="hero-marquee-panel" key={`${group}-${index}`}>
                  <img
                    src={image}
                    alt=""
                    loading={group === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
