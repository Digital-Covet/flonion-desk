import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // No baseURL: better-auth resolves same-origin automatically
  // (window.location.origin + "/api/auth" in the browser, BETTER_AUTH_URL on
  // the server). Passing an explicit relative "/api/auth" crashes SSR with
  // "Invalid base URL", and an absolute fallback like http://localhost:3000
  // would leak into production and break sign-in from desk.flonion.com.
  fetchOptions: {
    // Credentials are required for the session cookie to be sent on the
    // OAuth callback into the API.
    credentials: "include",
  },
});
