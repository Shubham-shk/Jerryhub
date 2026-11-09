import { ArrowRight, Flame, Play, Sparkles, Star } from "lucide-react";
import { BASIC_PRICE_LABEL } from "../../lib/config";

const heroCards = [
  { src: "/posters/poster-01.svg", title: "Midnight Velvet", tag: "Interactive", meta: "18 min · 2K" },
  { src: "/posters/poster-05.svg", title: "After Hours", tag: "Trending", meta: "21 min · 2K" },
  { src: "/posters/poster-10.svg", title: "Golden Hour", tag: "New", meta: "12 min · 2K" },
];

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        {[2, 4, 7, 9].map((n) => (
          <img key={n} src={`/posters/poster-${String(n).padStart(2, "0")}.svg`} alt="" />
        ))}
      </div>
      <div className="hero-noise" aria-hidden="true" />
      <div className="hero-glow hero-glow--pink" aria-hidden="true" />
      <div className="hero-glow hero-glow--purple" aria-hidden="true" />

      <div className="container hero-inner">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="live-dot" />
            Private · Members only · 18+
          </div>

          <h1 className="hero-title">
            The Premium Streaming Platform for{" "}
            <span className="text-gradient">Adult Animation.</span>
          </h1>

          <p className="hero-sub">
            Stream thousands of exclusive animations, interactive CockHero experiences,
            high-resolution image sets and illustrated stories. One private library.
            Zero compromises.
          </p>

          <div className="hero-cta">
            <a href="#pricing" className="btn btn--primary btn--lg hero-cta-main">
              <Sparkles size={19} /> Explore Memberships
            </a>
            <a href="#trending" className="btn btn--ghost btn--lg">
              <Play size={17} /> Explore the library
            </a>
          </div>

          <p className="hero-micro">
            Premium entertainment starts at {BASIC_PRICE_LABEL} · Patreon verified · Cancel anytime
          </p>

          <div className="hero-proof">
            <div className="hero-rating">
              <div className="stars" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={13} fill="currentColor" />
                ))}
              </div>
              <span><strong>4.9/5</strong> from 2,400+ members</span>
            </div>
            <div className="hero-avatars" aria-hidden="true">
              {["AR", "MK", "JL", "SV"].map((initials, index) => (
                <span key={initials} style={{ zIndex: 5 - index }}>{initials}</span>
              ))}
            </div>
          </div>

          <div className="hero-stats">
            <div><strong>100+</strong><span>media files</span></div>
            <div><strong>Daily</strong><span>new drops</span></div>
            <div><strong>2K</strong><span>quality</span></div>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-ring" />
          {heroCards.map((card, index) => (
            <div key={card.title} className={`hero-poster hero-poster--${index + 1}`}>
              <img src={card.src} alt="" />
              <div className="hero-poster-shade" />
              <span className="hero-poster-tag">
                {index === 1 ? <Flame size={10} /> : <Sparkles size={10} />} {card.tag}
              </span>
              <div className="hero-poster-copy">
                <strong>{card.title}</strong>
                <span>{card.meta}</span>
              </div>
              <span className="hero-poster-play"><Play size={16} fill="currentColor" /></span>
            </div>
          ))}

          <div className="hero-float hero-float--top">
            <span className="hero-float-icon"><Sparkles size={15} /></span>
            <div>
              <strong>New today</strong>
              <span>Midnight Velvet</span>
            </div>
          </div>

          <div className="hero-float hero-float--bottom">
            <span className="hero-float-icon hero-float-icon--green">
              <ArrowRight size={15} />
            </span>
            <div>
              <strong>Instant unlock</strong>
              <span>Verified via Patreon</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container hero-ticker">
        <span>INTERACTIVE COCKHERO</span>
        <span className="ticker-dot" />
        <span>2K ANIMATION</span>
        <span className="ticker-dot" />
        <span>IMAGE SETS</span>
        <span className="ticker-dot" />
        <span>PDF STORIES</span>
        <span className="ticker-dot" />
        <span>FUNSCRIPTS</span>
        <span className="ticker-dot" />
        <span>DAILY UPDATES</span>
      </div>
    </section>
  );
}
