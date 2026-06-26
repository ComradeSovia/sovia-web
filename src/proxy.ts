import { middleware } from "../middleware";

export function proxy(request: Parameters<typeof middleware>[0]) {
  return middleware(request);
}

export const config = {
  matcher: [
    "/test/:path*",
    "/:lang",
    "/:lang/test/:path*",
    "/((?!api|_next|.*\\..*).*)",
  ],
};
