import { OPERATOR_COOKIE } from "../prisma/operator";
import type { Route } from "./+types/console.unlock";

/**
 * Temporary route that sets the operator cookie.
 *
 * This exists because the console has no login yet. An operator visits
 * `/console/unlock?token=<their-token>`, the route validates it against the
 * token map and sets the cookie, then redirects to the overview.
 *
 * This route is deleted when real auth lands.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token parameter", { status: 400 });
  }

  // Validate against the token table (same logic as operator.ts)
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const raw = process.env.DESK_OPERATOR_TOKENS ?? "";
  let valid = false;

  for (const entry of raw.split(",")) {
    const [, expected] = entry.split("=").map((part) => part.trim());
    if (!expected) continue;

    const ha = createHash("sha256").update(expected).digest();
    const hb = createHash("sha256").update(token).digest();
    if (timingSafeEqual(ha, hb)) {
      valid = true;
      break;
    }
  }

  if (!valid) {
    return new Response("Invalid token", { status: 403 });
  }

  // Set the cookie and redirect to overview
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `${OPERATOR_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    },
  });
}
