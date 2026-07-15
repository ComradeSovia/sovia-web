"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

export function AdminDirtyForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;

    const confirmLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const confirmNavigation = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      if (!window.confirm("You have unsaved changes. Leave this step?")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      setDirty(false);
    };

    window.addEventListener("beforeunload", confirmLeave);
    document.addEventListener("click", confirmNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", confirmLeave);
      document.removeEventListener("click", confirmNavigation, true);
    };
  }, [dirty]);

  function handleSubmit(_event: FormEvent<HTMLFormElement>) {
    setDirty(false);
  }

  return (
    <form
      action={action}
      className={className}
      onChange={() => setDirty(true)}
      onSubmit={handleSubmit}
    >
      {children}
    </form>
  );
}
