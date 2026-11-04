"use client";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./song-plans.module.css";

const VotingContext = createContext<{
  busy: boolean;
  run: (task: () => Promise<void>) => Promise<void>;
} | null>(null);
export function VotingProvider({ children }: { children: ReactNode }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <VotingContext.Provider value={{ busy, run }}>
      {children}
    </VotingContext.Provider>
  );
}
export function VoteButton({
  id,
  supported,
  supports,
  recent,
  copy,
  preview = false,
}: {
  id: string;
  supported: boolean;
  supports: number;
  recent: number;
  copy: SharedCopy["songPlans"];
  preview?: boolean;
}) {
  const context = useContext(VotingContext);
  const router = useRouter();
  const [vote, setVote] = useState({ supported, supports, recent });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(
    () => setVote({ supported, supports, recent }),
    [supported, supports, recent],
  );
  if (!context) throw new Error("VotingProvider is required");
  const { busy, run } = context;
  async function support() {
    await run(async () => {
      setSaving(true);
      setError("");
      try {
        const send = () =>
          fetch(`/api/song-plans/${encodeURIComponent(id)}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supported: !vote.supported }),
          });
        const decode = async (response: Response) => {
          const value: unknown = await response.json();
          if (!value || typeof value !== "object" || Array.isArray(value))
            throw new Error(copy.voteError);
          return value as Record<string, unknown>;
        };
        let response = await send();
        let result = await decode(response);
        if (result.initialize === true) {
          response = await send();
          result = await decode(response);
        }
        if (result.initialize === true) throw new Error(copy.cookiesRequired);
        if (!response.ok)
          throw new Error(
            result.code === "rateLimited" ? copy.rateLimited : copy.voteError,
          );
        if (
          typeof result.supported !== "boolean" ||
          typeof result.supports !== "number" ||
          typeof result.recent !== "number" ||
          !Number.isInteger(result.supports) ||
          !Number.isInteger(result.recent)
        )
          throw new Error(copy.voteError);
        setVote({
          supported: result.supported,
          supports: result.supports,
          recent: result.recent,
        });
        router.refresh();
      } catch (failure) {
        setError(
          failure instanceof Error &&
            [copy.cookiesRequired, copy.rateLimited].includes(failure.message)
            ? failure.message
            : copy.voteError,
        );
      } finally {
        setSaving(false);
      }
    });
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          aria-pressed={vote.supported}
          disabled={busy || preview}
          onClick={support}
          className={styles.voteButton}
        >
          <Heart
            aria-hidden="true"
            className={`size-4 ${vote.supported ? "fill-current" : ""}`}
          />
          {saving
            ? copy.saving
            : vote.supported
              ? copy.supportedAction
              : copy.supportAction}
        </button>
        <span
          className={`${styles.supportCount} tabular-nums`}
          aria-live="polite"
        >
          <strong>{vote.supports}</strong> {copy.supports}
        </span>
      </div>
      <p className="text-xs text-relief" aria-live="polite">
        {vote.recent} {copy.recentSupports}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
