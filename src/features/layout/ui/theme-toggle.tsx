"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "sovia-theme";

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
}

function getSystemTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function SunIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <title>Light mode</title>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.9 4.9 2.1 2.1" />
      <path d="m17 17 2.1 2.1" />
      <path d="m19.1 4.9-2.1 2.1" />
      <path d="m7 17-2.1 2.1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <title>Dark mode</title>
      <path d="M20 15.6A8 8 0 0 1 8.4 4 8.4 8.4 0 1 0 20 15.6Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const savedMode = window.localStorage.getItem(
      STORAGE_KEY,
    ) as ThemeMode | null;

    if (savedMode === "light" || savedMode === "dark") {
      setMode(savedMode);
      applyTheme(savedMode);
      return;
    }

    const systemMode = getSystemTheme();
    setMode(systemMode);
    applyTheme(systemMode);
  }, []);

  function updateMode() {
    const nextMode = mode === "dark" ? "light" : "dark";

    setMode(nextMode);
    applyTheme(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  }

  const isDark = mode === "dark";

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      className="grid h-10 w-20 shrink-0 grid-cols-2 border-2 border-ink bg-paper p-1 text-[10px] font-black uppercase tracking-[0.08em] text-ink shadow-ink transition-colors hover-bg-yellow hover-text-block"
      onClick={updateMode}
      type="button"
    >
      <span
        className={[
          "grid place-items-center transition-colors",
          isDark ? "bg-transparent text-ink" : "bg-red text-relief",
        ].join(" ")}
      >
        <SunIcon />
      </span>
      <span
        className={[
          "grid place-items-center transition-colors",
          isDark ? "bg-red text-relief" : "bg-transparent text-ink",
        ].join(" ")}
      >
        <MoonIcon />
      </span>
    </button>
  );
}
