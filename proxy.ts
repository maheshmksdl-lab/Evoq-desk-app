import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, HOME_ROUTE, SESSION_COOKIE } from "@/lib/auth-routes";

/**
 * Route guard. Without a session every page redirects to Login; with one,
 * the auth pages (and the root URL) go straight to Overview. This is an
 * optimistic cookie check for the mock session — a real backend must still
 * authorise every request it serves.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.get(SESSION_COOKIE)?.value === "true";
  const authPage = AUTH_ROUTES.includes(pathname);

  if (!signedIn && !authPage) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && (authPage || pathname === "/")) return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files (anything with a file extension, e.g. /media/*.png, /favicon.ico).
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
