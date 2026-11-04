"use client";

import type { ReactNode } from "react";
import styles from "./planning-workspace.module.css";

export function ReviewDetails({
  children,
  title = "Edit detailed fields",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <details
      className={styles.details}
      onInvalidCapture={(event) => {
        // Native validation must be able to focus fields in a folded section.
        let parent =
          event.target instanceof HTMLElement
            ? event.target.parentElement
            : null;
        while (parent) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
          parent = parent.parentElement;
        }
      }}
    >
      <summary>{title}</summary>
      <div className={styles.fields}>{children}</div>
    </details>
  );
}
