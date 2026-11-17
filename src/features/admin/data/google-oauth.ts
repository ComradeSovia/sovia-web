import type { NextRequest } from "next/server";
import { getAdminUrl, getOriginalRequestUrl } from "./admin-url";

const GOOGLE_ADMIN_CALLBACK_PATH = "/admin/login/google/callback";

export function getGoogleAdminRedirectUri(request: NextRequest) {
  return getAdminUrl(GOOGLE_ADMIN_CALLBACK_PATH, request).toString();
}

export function getSafeGoogleAdminReturnPath(value?: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return undefined;
  const localOrigin = "https://return.invalid";
  try {
    return new URL(value, localOrigin).origin === localOrigin
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export function getGoogleAdminLoginReturnPath(request: NextRequest) {
  const next = getOriginalRequestUrl(request).searchParams.get("next");
  return getSafeGoogleAdminReturnPath(next);
}
