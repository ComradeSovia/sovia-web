"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type FieldState = "changed" | "database" | "empty" | "invalid" | "warning";

const FIELD_STATE_LABELS: Record<FieldState, string> = {
  changed: "Modified",
  database: "Database",
  empty: "Empty",
  invalid: "Blocking error",
  warning: "Warning",
};

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
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    updateFieldStates(form);

    const update = () => updateFieldStates(form);
    form.addEventListener("change", update);
    form.addEventListener("input", update);
    form.addEventListener("invalid", update, true);

    return () => {
      form.removeEventListener("change", update);
      form.removeEventListener("input", update);
      form.removeEventListener("invalid", update, true);
    };
  }, []);

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

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(anchor.href);
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
    <>
      <form
        action={action}
        className={className}
        data-admin-dirty-form="true"
        onChange={() => setDirty(true)}
        onSubmit={handleSubmit}
        ref={formRef}
      >
        {children}
      </form>
      <AdminConfirmDialog
        confirmLabel="Leave"
        message="You have unsaved changes in this step. Leave without saving?"
        onCancel={() => setPendingHref(null)}
        onConfirm={() => {
          const href = pendingHref;
          setPendingHref(null);
          setDirty(false);
          if (href) {
            window.location.assign(href);
          }
        }}
        open={Boolean(pendingHref)}
        title="Unsaved changes"
      />
    </>
  );
}

export function AdminConfirmForm({
  action,
  children,
  className,
  message,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <form
        action={action}
        className={className}
        onSubmit={handleSubmit}
        ref={formRef}
      >
        {children}
      </form>
      <AdminConfirmDialog
        confirmLabel="Clear data"
        message={message}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          confirmedRef.current = true;
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
        open={open}
        title="Clear step data?"
        variant="danger"
      />
    </>
  );
}

function AdminConfirmDialog({
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "default",
}: {
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  variant?: "danger" | "default";
}) {
  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "border-red-500 bg-red-500 text-white hover:bg-red-400"
      : "border-zinc-100 bg-zinc-100 text-zinc-950 hover:bg-white";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-md border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
        role="dialog"
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`rounded-md border px-3 py-2 text-sm font-medium ${confirmClass}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function updateFieldStates(form: HTMLFormElement) {
  const fields = Array.from(
    form.querySelectorAll<HTMLElement>("[data-admin-field-name]"),
  );

  for (const field of fields) {
    const name = field.dataset.adminFieldName;
    if (!name) continue;

    const element = getNamedControl(form, name);
    if (!isFieldControl(element)) continue;

    const state = getFieldState(field, element);
    field.dataset.fieldState = state;

    const status = field.querySelector<HTMLElement>(
      "[data-admin-field-status]",
    );
    if (status) {
      status.textContent = FIELD_STATE_LABELS[state];
    }
  }
}

function getNamedControl(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  if (!(control instanceof RadioNodeList)) return control;
  return control.item(0);
}

function isFieldControl(value: unknown): value is FieldControl {
  return (
    value instanceof HTMLInputElement ||
    value instanceof HTMLTextAreaElement ||
    value instanceof HTMLSelectElement
  );
}

type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function getFieldState(field: HTMLElement, control: FieldControl): FieldState {
  const currentValue = normalizeFieldValue(getCurrentValue(control));
  const initialValue = normalizeFieldValue(getInitialValue(field, control));

  if (isInitializingSelect(control, currentValue, initialValue)) {
    return "database";
  }
  if (!control.validity.valid) return "invalid";
  if (hasSoftWarning(control, currentValue)) return "warning";
  if (currentValue !== initialValue) return "changed";
  if (!currentValue.trim()) return "empty";
  return "database";
}

function normalizeFieldValue(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function getCurrentValue(control: FieldControl) {
  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    return control.checked ? "on" : "";
  }

  return control.value;
}

function getInitialValue(field: HTMLElement, control: FieldControl) {
  if (field.dataset.adminInitialValue !== undefined) {
    return field.dataset.adminInitialValue;
  }

  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    return control.defaultChecked ? "on" : "";
  }

  if (control instanceof HTMLSelectElement) {
    return (
      Array.from(control.options).find((option) => option.defaultSelected)
        ?.value ?? ""
    );
  }

  return control.defaultValue;
}

function isInitializingSelect(
  control: FieldControl,
  currentValue: string,
  initialValue: string,
) {
  return (
    control instanceof HTMLSelectElement &&
    !currentValue &&
    Boolean(initialValue)
  );
}

function hasSoftWarning(control: FieldControl, value: string) {
  if (!value) return false;
  if (value !== value.trim()) return true;

  if (
    control instanceof HTMLInputElement &&
    control.type === "date" &&
    value > new Date().toISOString().slice(0, 10)
  ) {
    return true;
  }

  return (
    control instanceof HTMLInputElement &&
    control.dataset.adminWarning === "id" &&
    /^https?:\/\//i.test(value)
  );
}
