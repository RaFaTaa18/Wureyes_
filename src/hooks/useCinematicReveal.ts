import { useEffect, useRef } from "react";

/**
 * Adds viewport-triggered reveal classes only when motion is allowed.
 * Content remains visible by default if reduced motion is requested or
 * IntersectionObserver is unavailable.
 */
export function useCinematicReveal<T extends HTMLElement>() {
  const sectionRef = useRef<T | null>(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (
      !section ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const targets = section.querySelectorAll<HTMLElement>(
      "[data-cinematic-reveal], [data-cinematic-stagger]",
    );

    targets.forEach((target) => {
      target.classList.add("cinematic-reveal-ready");
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("cinematic-is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -36px 0px",
      },
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return sectionRef;
}
