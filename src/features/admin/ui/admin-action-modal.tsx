"use client";

import { Sparkles, X } from "lucide-react";
import { type ReactNode, useState } from "react";

const ACTION_BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 shadow-lg shadow-black/20 transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500";

export function AdminActionModal({
  children,
  bodyClassName = "",
  closeDisabled = false,
  description,
  footer,
  hideTrigger = false,
  initialOpen = false,
  listItem = false,
  onDismiss,
  onOpenChange,
  open: controlledOpen,
  size = "default",
  title,
  type = "default",
}: {
  children: ReactNode;
  bodyClassName?: string;
  closeDisabled?: boolean;
  description?: string;
  footer?: ReactNode;
  hideTrigger?: boolean;
  initialOpen?: boolean;
  listItem?: boolean;
  onDismiss?: () => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  size?: "compact" | "default" | "wide";
  title: string;
  type?: "ai" | "default";
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);
  const Icon = type === "ai" ? Sparkles : null;
  const open = controlledOpen ?? uncontrolledOpen;
  const widthClass =
    size === "wide"
      ? "max-w-4xl"
      : size === "compact"
        ? "max-w-md"
        : "max-w-xl";

  function setOpen(nextOpen: boolean) {
    if (!nextOpen && closeDisabled) return;
    setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  return (
    <div className="pointer-events-auto">
      {!hideTrigger ? (
        <button
          className={`${ACTION_BUTTON_CLASS} ${
            listItem ? "w-full items-start justify-start text-left" : ""
          }`}
          onClick={() => setOpen(true)}
          type="button"
        >
          {Icon ? (
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
          ) : null}
          <span className="grid gap-1">
            <span>{title}</span>
            {listItem && description ? (
              <span className="text-xs leading-5 font-normal text-zinc-400">
                {description}
              </span>
            ) : null}
          </span>
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div
            aria-modal="true"
            className={`relative grid max-h-[min(48rem,calc(100dvh-2rem))] w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl ${widthClass}`}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 pb-4 pr-10">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
                  {Icon ? <Icon className="h-4 w-4 text-yellow-300" /> : null}
                  {title}
                </h2>
                {description ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                aria-label="Close action"
                className="absolute top-4 right-4 inline-grid h-8 w-8 place-items-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={closeDisabled}
                onClick={() => {
                  setOpen(false);
                  onDismiss?.();
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className={`grid min-h-0 gap-4 overflow-y-auto overscroll-contain border-t border-zinc-800 py-4 pr-2 ${bodyClassName}`}
            >
              {children}
            </div>
            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800 pt-4">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
