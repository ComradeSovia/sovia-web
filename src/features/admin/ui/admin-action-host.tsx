"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getAdminAction,
  getAdminPageActions,
  getAdminTodoPageActions,
} from "../actions/registry";
import type {
  AdminActionDefinition,
  AdminActionInputValues,
} from "../actions/types";
import {
  clearActionSearchParams,
  getActionInputValues,
  getActionSearchParams,
} from "../actions/url-state";
import { AdminActionModal } from "./admin-action-modal";
import { AdminActionToast } from "./admin-action-toast";
import {
  AdminActionLauncher,
  AdminActionPicker,
} from "./admin-content-action-launcher";

function toHref(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AdminActionHost({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<AdminActionDefinition | null>(null);
  const [dismissedActionId, setDismissedActionId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );

  const contentMatch = /^\/admin\/content\/([^/]+)$/.exec(pathname);
  const contentId = contentMatch?.[1]
    ? decodeURIComponent(contentMatch[1])
    : undefined;
  const pageActions = contentId
    ? getAdminPageActions(searchParams.get("step"))
    : pathname === "/admin/todo"
      ? getAdminTodoPageActions()
      : [];
  const selectedAction = getAdminAction(searchParams.get("action") ?? "");
  const activeAction =
    pendingAction ??
    (selectedAction?.id === dismissedActionId ? null : selectedAction);
  const consumeOutput = Boolean(
    activeAction && pageActions.some((action) => action.id === activeAction.id),
  );

  useEffect(() => {
    if (selectedAction) setPendingAction(null);
    if (selectedAction?.id !== dismissedActionId) setDismissedActionId(null);
  }, [dismissedActionId, selectedAction]);

  if (!enabled) return null;

  const initialValues = activeAction
    ? getActionInputValues(activeAction, new URLSearchParams(searchParams), {
        ...(contentId ? { contentId } : {}),
      })
    : {};

  function selectAction(action: AdminActionDefinition) {
    const defaults: AdminActionInputValues = contentId ? { contentId } : {};
    const next = getActionSearchParams(
      new URLSearchParams(searchParams),
      action,
      defaults,
    );
    setPickerOpen(false);
    setPendingAction(action);
    router.replace(toHref(pathname, next));
  }

  function updateActionInput(values: AdminActionInputValues) {
    if (!activeAction) return;
    const next = getActionSearchParams(
      new URLSearchParams(searchParams),
      activeAction,
      values,
    );
    router.replace(toHref(pathname, next), { scroll: false });
  }

  function closeAction(open: boolean) {
    if (open || !activeAction) return;
    const next = clearActionSearchParams(
      new URLSearchParams(searchParams),
      activeAction,
    );
    setPendingAction(null);
    setDismissedActionId(activeAction.id);
    router.replace(toHref(pathname, next), { scroll: false });
  }

  function dismissAction() {
    if (pageActions.length) setPickerOpen(true);
  }

  return (
    <>
      <AdminActionToast
        key={toast?.id}
        message={toast?.message}
        status="success"
      />
      {pageActions.length ? (
        <div className="fixed right-5 bottom-5 z-30">
          <AdminActionModal
            description="Actions available for the current content step."
            onOpenChange={setPickerOpen}
            open={pickerOpen}
            title="Actions"
          >
            <AdminActionPicker actions={pageActions} onSelect={selectAction} />
          </AdminActionModal>
        </div>
      ) : null}
      {activeAction ? (
        <AdminActionLauncher
          action={activeAction}
          consumeOutput={consumeOutput}
          initialValues={initialValues}
          key={activeAction.id}
          onActionComplete={(message) => setToast({ id: Date.now(), message })}
          onDismiss={dismissAction}
          onInputValuesChange={updateActionInput}
          onOpenChange={closeAction}
          open
        />
      ) : null}
    </>
  );
}
