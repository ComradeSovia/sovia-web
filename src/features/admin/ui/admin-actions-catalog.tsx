"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ADMIN_ACTIONS } from "../actions/registry";
import type { AdminActionDefinition } from "../actions/types";
import { getActionSearchParams } from "../actions/url-state";
import { AdminActionPicker } from "./admin-content-action-launcher";

export function AdminActionsCatalog() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectAction(action: AdminActionDefinition) {
    const next = getActionSearchParams(
      new URLSearchParams(searchParams),
      action,
      {},
    );
    router.replace(`${pathname}?${next.toString()}`);
  }

  return <AdminActionPicker actions={ADMIN_ACTIONS} onSelect={selectAction} />;
}
