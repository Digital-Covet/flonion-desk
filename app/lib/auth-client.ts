import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:3000",
  fetchOptions: {
    // Credentials are required for the session cookie to be sent on the
    // cross-origin OAuth callback into the API.
    credentials: "include",
  },
});
