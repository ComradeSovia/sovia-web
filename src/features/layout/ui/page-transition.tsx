"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import styles from "./page-transition.module.css";

/** Animate committed route changes without intercepting navigation or remounting pages. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const finishProgressRef = useRef<() => void>(() => {});

  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;

    let active = false;
    let startedAt = 0;
    let progress = 0;
    let tick: number | undefined;
    let fallback: number | undefined;
    let complete: number | undefined;
    let hide: number | undefined;

    function stopTimers() {
      window.clearInterval(tick);
      window.clearTimeout(fallback);
      window.clearTimeout(complete);
      window.clearTimeout(hide);
    }

    function finish() {
      if (!bar || !active) return;
      active = false;
      window.clearInterval(tick);
      window.clearTimeout(fallback);
      complete = window.setTimeout(
        () => {
          bar.style.transform = "scaleX(1)";
          hide = window.setTimeout(() => {
            bar.style.opacity = "0";
          }, 220);
        },
        Math.max(0, 180 - (performance.now() - startedAt)),
      );
    }

    function start() {
      if (!bar || active) return;
      stopTimers();
      active = true;
      startedAt = performance.now();
      progress = 0.08;
      bar.style.transition = "none";
      bar.style.opacity = "1";
      bar.style.transform = "scaleX(0.08)";
      window.requestAnimationFrame(() => {
        bar.style.transition = "";
      });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        tick = window.setInterval(() => {
          progress = Math.min(0.9, progress + (0.9 - progress) * 0.12);
          bar.style.transform = "scaleX(" + progress + ")";
        }, 120);
      }
      fallback = window.setTimeout(finish, 12000);
    }

    function onClick(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      )
        return;
      const destination = new URL(link.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      start();
    }

    finishProgressRef.current = finish;
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    window.addEventListener("pageshow", finish);
    return () => {
      stopTimers();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      window.removeEventListener("pageshow", finish);
      finishProgressRef.current = () => {};
    };
  }, []);

  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    finishProgressRef.current();

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
      <div
        ref={progressRef}
        className={styles.progressBar}
        aria-hidden="true"
      />
      <div className={styles.overlay} ref={overlayRef} aria-hidden="true">
        <div className={styles.band} />
      </div>
      <div className={styles.content} ref={contentRef}>
        {children}
      </div>
    </>
  );
}
