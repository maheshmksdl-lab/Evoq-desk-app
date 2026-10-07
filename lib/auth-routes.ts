/** Session cookie set by sign-in and cleared by log out. */
export const SESSION_COOKIE = "desk_auth";

/** Pages open without a session (and full-screen: no app header or sidebar). */
export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

/** Where a signed-in agent lands: Overview is home. */
export const HOME_ROUTE = "/overview";
