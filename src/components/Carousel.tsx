import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface CarouselProps {
  children: ReactNode;
  label: string;
}

export function Carousel({ children, label }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setCanScroll({
      left: track.scrollLeft > 6,
      right: max > 6 && track.scrollLeft < max - 6,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    update();
    track.addEventListener("scroll", update, { passive: true });

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(track);

    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [children, update]);

  function scroll(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>(".poster-card");
    const step = firstCard ? firstCard.offsetWidth + 28 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * Math.max(step * 2, 320), behavior: "smooth" });
  }

  return (
    <div className="poster-carousel">
      <button
        type="button"
        className={`poster-nav poster-nav--prev${canScroll.left ? "" : " is-hidden"}`}
        aria-label={`Scroll ${label} left`}
        onClick={() => scroll(-1)}
        tabIndex={canScroll.left ? 0 : -1}
      >
        <ChevronLeft size={26} />
      </button>

      <div className="poster-track" ref={trackRef} aria-label={label}>
        {children}
      </div>

      <button
        type="button"
        className={`poster-nav poster-nav--next${canScroll.right ? "" : " is-hidden"}`}
        aria-label={`Scroll ${label} right`}
        onClick={() => scroll(1)}
        tabIndex={canScroll.right ? 0 : -1}
      >
        <ChevronRight size={26} />
      </button>
    </div>
  );
}
