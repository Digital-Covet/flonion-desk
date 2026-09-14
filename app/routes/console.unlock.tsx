import { data, Form, redirect } from "react-router";
import { clientIp } from "../prisma/audit";
import { operatorForToken, operatorSessionCookie } from "../prisma/operator";
import type { Route } from "./+types/console.unlock";

/**
 * Temporary route that exchanges an operator token for a session cookie.
 *
 * This exists because the console has no login yet. The token is POSTed from
 * the form below, never put in a URL, where it would land in request logs and
 * browser history. The cookie it sets carries a signed, expiring session, not
 * the token. See `operator.ts`.
 *
 * This route is deleted when real auth lands.
 */

export function meta(_: Route.MetaArgs) {
  return [{ title: "Flonion Desk — Unlock" }];
}

/**
 * Failed attempts per client address. In-process only, so each server instance
 * counts separately; the tokens' own entropy is the real defence, and this
 * keeps a single client from guessing at speed.
 */
const FAILURE_WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

function isLockedOut(key: string, now: number): boolean {
  const entry = failures.get(key);
  return (
    entry !== undefined && entry.resetAt > now && entry.count >= MAX_FAILURES
  );
}

function noteFailure(key: string, now: number) {
  for (const [k, entry] of failures) {
    if (entry.resetAt <= now) failures.delete(k);
  }
  const entry = failures.get(key);
  if (entry) entry.count++;
  else failures.set(key, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
}

export function loader({ request }: Route.LoaderArgs) {
  if (new URL(request.url).searchParams.has("token")) {
    throw new Response(
      "Tokens are not accepted in the URL. Use the unlock form, and rotate any token that was sent this way.",
      { status: 400 },
    );
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const key = clientIp(request) ?? "unknown";
  const now = Date.now();

  if (isLockedOut(key, now)) {
    return data(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const form = await request.formData();
  const token = String(form.get("token") ?? "").trim();
  const operator = operatorForToken(token);

  if (!operator) {
    noteFailure(key, now);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return data({ error: "Invalid token" }, { status: 403 });
  }

  failures.delete(key);
  return redirect("/", {
    headers: { "Set-Cookie": operatorSessionCookie(operator) },
  });
}

export default function Unlock({ actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8]">
      <Form
        method="post"
        className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200 p-8"
      >
        <h1 className="text-2xl font-heading font-semibold text-gray-900 text-center">
          Flonion Desk
        </h1>
        <p className="text-sm text-gray-500 mt-2 mb-6 text-center">
          Paste your operator token to unlock the console.
        </p>

        <label
          className="block text-sm font-medium text-gray-700"
          htmlFor="token"
        >
          Operator token
        </label>
        <input
          id="token"
          name="token"
          type="password"
          autoComplete="off"
          required
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        {actionData?.error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {actionData.error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-6 w-full bg-gray-900 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Unlock
        </button>
      </Form>
    </div>
  );
}
