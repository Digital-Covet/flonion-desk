import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The single gate every operator read and write passes through.
 *
 * The console has no login yet. Until it does, this module is the whole
 * authorization story, and it exists so that story lives in one auditable file
 * rather than being spread across a dozen loaders. When real sessions arrive,
 * `currentOperator` is the only function that changes; nothing that calls
 * `requireOperator` or `requireOperatorRead` needs touching.
 *
 * This is deliberately a temporary door:
 *
 * - It guards impersonation into any tenant account and cross-tenant deletes.
 * - Tokens are exchanged once, via POST, for a signed session cookie. The
 *   cookie never carries the token, expires server-side, and is signed with
 *   the operator's own token, so rotating a person's token revokes every
 *   session they hold.
 *
 * What it does buy, and the reason it is not a single global secret, is a real
 * `operatorId` on every audit row. An audit trail that says "operator" for
 * everyone answers none of the questions an audit trail exists to answer.
 */

/** Who performed an action. Opaque until the console has real accounts. */
export interface Operator {
  id: string;
  label: string;
}

/** Cookie holding the operator's signed session. Set by the unlock route. */
export const OPERATOR_COOKIE = "desk_operator";

/** How long an unlocked session lasts. */
const SESSION_TTL_SECONDS = 8 * 60 * 60;

const isProduction = process.env.NODE_ENV === "production";

/**
 * `DESK_OPERATOR_TOKENS` maps a person to their token:
 *
 *     DESK_OPERATOR_TOKENS="atharva=<openssl rand -base64 32>,ops=<...>"
 *
 * The key becomes the operator id and label, the value is the token they paste
 * into the unlock page. Give each person their own; sharing one defeats the
 * only thing this scheme is good for. Only the first `=` separates the two, so
 * base64 padding in a token survives.
 */
function operatorTable(): Map<string, Operator> {
  const raw = process.env.DESK_OPERATOR_TOKENS ?? "";
  const table = new Map<string, Operator>();

  for (const entry of raw.split(",")) {
    const eq = entry.indexOf("=");
    if (eq === -1) continue;
    const id = entry.slice(0, eq).trim();
    const token = entry.slice(eq + 1).trim();
    if (!id || !token) continue;
    table.set(token, { id, label: id });
  }

  return table;
}

// A production server with no operators serves nothing and accepts nothing, so
// refuse to start rather than come up looking healthy.
if (isProduction && operatorTable().size === 0) {
  throw new Error(
    "DESK_OPERATOR_TOKENS is empty. Configure at least one operator token before starting in production.",
  );
}

/** Reads one cookie out of a request without pulling in a cookie library. */
function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Compare two secrets without leaking their common prefix through timing.
 *
 * Both sides are hashed first so the buffers are always the same length —
 * `timingSafeEqual` throws on a length mismatch, and the mismatch itself would
 * otherwise reveal the token's length.
 */
function secretEquals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** The operator a pasted token belongs to, or `null`. */
export function operatorForToken(presented: string): Operator | null {
  if (!presented) return null;

  // Walk every entry rather than a map lookup, so a valid token and an invalid
  // one take the same path.
  let found: Operator | null = null;
  for (const [token, operator] of operatorTable()) {
    if (secretEquals(token, presented)) found = operator;
  }

  return found;
}

function sign(token: string, body: string): string {
  return createHmac("sha256", token).update(body).digest("base64url");
}

/** A `Set-Cookie` value that starts a session for `operator`. */
export function operatorSessionCookie(operator: Operator): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const body = `${operator.id}.${expires}`;

  // Sign with the operator's own token, so removing or rotating it revokes the
  // session. Every entry for this id is a candidate; the first will do.
  let signature = "";
  for (const [token, candidate] of operatorTable()) {
    if (candidate.id === operator.id) {
      signature = sign(token, body);
      break;
    }
  }

  return serializeCookie(`${body}.${signature}`, SESSION_TTL_SECONDS);
}

/** A `Set-Cookie` value that ends the session. */
export function clearOperatorCookie(): string {
  return serializeCookie("", 0);
}

function serializeCookie(value: string, maxAge: number): string {
  const secure = isProduction ? "; Secure" : "";
  return `${OPERATOR_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** The operator behind this request, or `null` if the session is absent, expired, or forged. */
export function currentOperator(request: Request): Operator | null {
  const presented = readCookie(request, OPERATOR_COOKIE);
  if (!presented) return null;

  // `<id>.<expires>.<signature>`, split from the right so an id may contain dots.
  const sigAt = presented.lastIndexOf(".");
  const expAt = presented.lastIndexOf(".", sigAt - 1);
  if (sigAt <= 0 || expAt <= 0) return null;

  const id = presented.slice(0, expAt);
  const expires = Number(presented.slice(expAt + 1, sigAt));
  const signature = presented.slice(sigAt + 1);
  if (!Number.isInteger(expires) || expires * 1000 <= Date.now()) return null;

  const body = `${id}.${expires}`;
  let found: Operator | null = null;
  for (const [token, operator] of operatorTable()) {
    if (operator.id !== id) continue;
    if (secretEquals(sign(token, body), signature)) found = operator;
  }

  return found;
}

/**
 * Gate a read. Fails closed.
 *
 * Every loader under the console calls this itself, before touching the
 * database. A layout loader cannot do it for them: React Router runs matched
 * loaders in parallel, and a single-fetch request (`/users.data?_routes=...`)
 * runs only the loaders it names.
 *
 * Local development can opt out with `OPERATOR_READ_OPEN=1`, which is ignored
 * in production. The return value is `null` only in that case.
 */
export function requireOperatorRead(request: Request): Operator | null {
  const operator = currentOperator(request);
  if (operator) return operator;

  if (process.env.OPERATOR_READ_OPEN === "1" && !isProduction) return null;

  throw new Response("Operator token required", { status: 403 });
}

/**
 * Gate a write. Always fails closed.
 *
 * There is no development bypass on purpose. A write from this console edits
 * live customer data, so an unconfigured environment must not be able to make
 * one.
 */
export function requireOperator(request: Request): Operator {
  const operator = currentOperator(request);
  if (operator) return operator;

  if (operatorTable().size === 0) {
    throw new Response(
      "No operator tokens configured. Set DESK_OPERATOR_TOKENS.",
      { status: 503 },
    );
  }

  throw new Response("Operator token required", { status: 403 });
}
