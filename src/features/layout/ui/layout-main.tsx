import type { LayoutCopy } from "../i18n/copy";
import { PageTransition } from "./page-transition";

export function LayoutMain({
  children,
  copy,
}: {
  children: React.ReactNode;
  copy: LayoutCopy;
}) {
  return (
    <main id="main-content" className="site-main">
      <div className="site-status">
        <span>{copy.main.sectionLabel}</span>
        <span className="site-status-signal">
          <i aria-hidden="true" />
          {copy.main.signalLabel}
        </span>
      </div>
      <PageTransition>{children}</PageTransition>
    </main>
  );
}
