import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin: /login and /api/auth/* are served by the same host, so no
  // absolute URL is needed. This avoids CORS preflights entirely and means
  // no VITE_* variable has to be baked in at build time (a stale absolute
  // fallback like http://localhost:3000 would leak into production and break
  // sign-in from https://desk.flonion.com).
  baseURL: "/api/auth",
  fetchOptions: {
    // Credentials are required for the session cookie to be sent on the
    // OAuth callback into the API.
    credentials: "include",
  },
});
