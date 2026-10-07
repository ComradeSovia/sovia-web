"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import styles from "./page-transition.module.css";

/** Animate committed route changes without intercepting navigation or remounting pages. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    const content = contentRef.current;
    const overlay = overlayRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!content || !overlay || reducedMotion.matches || !content.animate)
      return;

    const compact = window.matchMedia("(max-width: 639px)").matches;
    const duration = compact ? 800 : 1000;
    const animations: Animation[] = [];
    const cancel = () => {
      for (const animation of animations) animation.cancel();
    };

    // A single low-contrast veil avoids alternating full-screen color flashes.
    animations.push(
      overlay.animate(
        [
          { opacity: 0, transform: "translateX(-12px)", offset: 0 },
          { opacity: 0.12, transform: "translateX(0)", offset: 0.35 },
          { opacity: 0, transform: "translateX(12px)", offset: 1 },
        ],
        { duration, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      ),
    );

    animations.push(
      content.animate(
        [
          { opacity: 0.88, transform: "translateY(4px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        },
      ),
    );

    // A preference change or a second navigation immediately releases every layer.
    reducedMotion.addEventListener("change", cancel);
    return () => {
      cancel();
      reducedMotion.removeEventListener("change", cancel);
    };
  }, [pathname]);

  return (
    <>
      <div className={styles.overlay} ref={overlayRef} aria-hidden="true">
        <div className={styles.band} />
      </div>
      <div className={styles.content} ref={contentRef}>
        {children}
      </div>
    </>
  );
}
