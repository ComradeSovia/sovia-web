import type { NextRequest } from "next/server";
import { getAdminUrl } from "./admin-url";

const GOOGLE_ADMIN_CALLBACK_PATH = "/admin/login/google/callback";

export function getGoogleAdminRedirectUri(request: NextRequest) {
  return getAdminUrl(GOOGLE_ADMIN_CALLBACK_PATH, request).toString();
}
