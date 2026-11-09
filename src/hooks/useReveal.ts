import { useEffect, useRef, useState } from "react";

/**
 * Adds a one-shot scroll reveal. Elements start hidden and animate in the first
 * time they reach the viewport. A scroll fallback guarantees content never stays
 * invisible when the page is jumped (scrollbar, anchor links, restored scroll).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const el: T = node;

    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    let done = false;
    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    function reveal() {
      if (done) return;
      done = true;
      setRevealed(true);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    }

    function check() {
      const rect = el.getBoundingClientRect();
      // Reveal when the element has reached — or already passed — the viewport.
      if (rect.top < window.innerHeight * 0.94) reveal();
    }

    function onScroll() {
      if (frame || done) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        check();
      });
    }

    observer.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return { ref, revealed };
}
