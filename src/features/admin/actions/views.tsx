"use client";

import type { ComponentType, ReactNode } from "react";
import { AdminDownloadSubtitlesActionView } from "../ui/admin-step-panels";
import {
  AdminTodoEditActionView,
  AdminTodoProposalActionView,
} from "../ui/admin-todo-proposal-panel";
import type { AdminActionFormOutput } from "./form-output";
import type {
  AdminActionDefinition,
  AdminActionInput,
  AdminActionRun,
} from "./types";

export type AdminActionViewProps = {
  action: AdminActionDefinition;
  busy: boolean;
  consumeOutput: boolean;
  execute: () => void;
  fillCurrentForm: (fields?: readonly AdminActionFormOutput[]) => void;
  formOutput: readonly AdminActionFormOutput[];
  renderInput: (input: AdminActionInput) => ReactNode;
  run: AdminActionRun;
  saveOutput: () => void;
  setInputValue: (key: string, value: string | boolean) => void;
  togglePreview: () => void;
};

const ADMIN_ACTION_VIEWS: Record<
  string,
  ComponentType<AdminActionViewProps>
> = {
  "download-subtitles": AdminDownloadSubtitlesActionView,
  "todo-edit": AdminTodoEditActionView,
  "todo-proposal-analysis": AdminTodoProposalActionView,
};

export function getAdminActionView(action: AdminActionDefinition) {
  if (
    action.presentation.type !== "custom" &&
    action.presentation.type !== "wizard"
  ) {
    return null;
  }

  return ADMIN_ACTION_VIEWS[action.presentation.view] ?? null;
}
