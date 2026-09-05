"use client";

import type { SharedCopy } from "@sovia/shared/i18n/copy";
import { Check, Mail, Music2, Send } from "lucide-react";
import { useActionState, useState } from "react";
import { type ContactState, submitContact } from "./actions";

type Copy = SharedCopy["contact"];
export function ContactPage({ copy }: { copy: Copy }) {
  const [kind, setKind] = useState<"letter" | "song">("letter");
  const [revision, setRevision] = useState(0);
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
      <p className="mb-4 text-xs font-black tracking-[0.25em] text-relief">
        SOVIA / CONTACT
      </p>
      <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-xl text-relief">{copy.intro}</p>
      <div className="mt-10 grid grid-cols-2 gap-3">
        {(["letter", "song"] as const).map((value) => {
          const Icon = value === "letter" ? Mail : Music2;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={`group flex items-center justify-center gap-3 border-2 border-ink px-3 py-5 font-bold motion-safe:transition-transform motion-safe:hover:-translate-y-1 ${kind === value ? "bg-ink text-block" : "bg-block"}`}
            >
              <Icon
                aria-hidden="true"
                className="size-5 motion-safe:transition-transform motion-safe:group-hover:-rotate-12"
              />
              {copy[value]}
            </button>
          );
        })}
      </div>
      <ContactForm
        key={`${kind}-${revision}`}
        kind={kind}
        copy={copy}
        reset={() => setRevision((value) => value + 1)}
      />
    </main>
  );
}
function ContactForm({
  kind,
  copy,
  reset,
}: {
  kind: "letter" | "song";
  copy: Copy;
  reset: () => void;
}) {
  const [state, action, pending] = useActionState<ContactState, FormData>(
    submitContact,
    {
      status: "idle",
    },
  );
  if (state.status === "success")
    return (
      <div className="mt-4 border-2 border-ink bg-block p-8">
        <Check aria-hidden="true" className="mb-4 size-8" />
        <output className="block" aria-live="polite">
          {copy.success}
        </output>
        <button type="button" className="mt-6 underline" onClick={reset}>
          {copy.another}
        </button>
      </div>
    );
  return (
    <form
      action={action}
      className="mt-4 space-y-5 border-2 border-ink bg-block p-5 sm:p-8"
    >
      <input type="hidden" name="kind" value={kind} />
      <div hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <fieldset disabled={pending} className="space-y-5 disabled:opacity-60">
        {kind === "letter" ? (
          <>
            <Input
              label={copy.name}
              name="name"
              maxLength={100}
              autoComplete="name"
            />
            <Input
              label={copy.email}
              name="email"
              type="email"
              maxLength={254}
              autoComplete="email"
            />
            <Input
              label={copy.body}
              name="body"
              required
              maxLength={10000}
              multiline
            />
          </>
        ) : (
          <>
            <Input
              label={copy.songTitle}
              name="songTitle"
              required
              maxLength={200}
            />
            <Input label={copy.artist} name="artist" maxLength={200} />
            <Input label={copy.url} name="url" type="url" maxLength={2000} />
            <Input label={copy.notes} name="notes" maxLength={3000} multiline />
          </>
        )}
        <button
          type="submit"
          className="flex items-center gap-3 border-2 border-ink bg-ink px-6 py-3 font-bold text-block motion-safe:transition-transform motion-safe:hover:translate-x-1 disabled:cursor-wait"
        >
          <Send
            aria-hidden="true"
            className={`size-4 ${pending ? "motion-safe:animate-pulse" : ""}`}
          />
          {pending ? copy.sending : copy.send}
        </button>
      </fieldset>
      <output className="block" aria-live="polite">
        {state.status === "error" || state.status === "invalid"
          ? copy[state.status]
          : ""}
      </output>
    </form>
  );
}
function Input({
  label,
  multiline,
  ...props
}: {
  label: string;
  multiline?: boolean;
  name: string;
  required?: boolean;
  maxLength: number;
  type?: string;
  autoComplete?: string;
}) {
  const [value, setValue] = useState("");
  const className =
    "mt-2 block w-full border-2 border-ink/30 bg-transparent px-3 py-3 outline-none focus:border-ink motion-safe:transition-colors";
  return (
    <label
      htmlFor={`contact-${props.name}`}
      className="block text-sm font-bold"
    >
      {label}
      {multiline ? (
        <textarea
          {...props}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          id={`contact-${props.name}`}
          rows={6}
          className={className}
        />
      ) : (
        <input
          {...props}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          id={`contact-${props.name}`}
          className={className}
        />
      )}
    </label>
  );
}
