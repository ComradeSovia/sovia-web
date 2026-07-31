import type { AdminActionDefinition, AdminActionInputValues } from "./types";

const ACTION_PARAM = "action";

function inputUrlKey(input: AdminActionDefinition["inputs"][number]) {
  return input.urlKey ?? input.key;
}

export function getActionInputValues(
  action: AdminActionDefinition,
  searchParams: URLSearchParams,
  defaults: AdminActionInputValues = {},
) {
  const values = { ...defaults };

  for (const input of action.inputs) {
    if (input.url !== "sync") continue;
    const value = searchParams.get(inputUrlKey(input));
    if (value === null) continue;
    values[input.key] = input.type === "checkbox" ? value === "true" : value;
  }

  return values;
}

export function getActionSearchParams(
  searchParams: URLSearchParams,
  action: AdminActionDefinition,
  values: AdminActionInputValues,
) {
  const next = new URLSearchParams(searchParams);
  next.set(ACTION_PARAM, action.id);

  for (const input of action.inputs) {
    if (input.url !== "sync") continue;
    const key = inputUrlKey(input);
    const value = values[input.key];
    next.delete(key);
    if (value === undefined || value === "" || value === false) continue;
    const serialized = String(value);
    if (serialized.length > (input.maxUrlLength ?? 160)) continue;
    next.set(key, serialized);
  }

  return next;
}

export function clearActionSearchParams(
  searchParams: URLSearchParams,
  action: AdminActionDefinition,
) {
  const next = new URLSearchParams(searchParams);
  next.delete(ACTION_PARAM);
  for (const input of action.inputs) {
    if (input.url === "sync") next.delete(inputUrlKey(input));
  }
  return next;
}
