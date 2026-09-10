import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The single gate every operator write passes through.
 *
 * The console has no login yet. Until it does, this module is the whole
 * authorization story, and it exists so that story lives in one auditable file
 * rather than being spread across a dozen loaders. When real sessions arrive,
 * `currentOperator` is the only function that changes; nothing that calls
 * `requireOperator` needs touching.
 *
 * This is deliberately a temporary door:
 *
 * - A shared bearer token has no revocation and no expiry beyond the cookie's.
 * - It guards impersonation into any tenant account and cross-tenant deletes.
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

/** Cookie holding the operator's token. Set by the unlock route. */
export const OPERATOR_COOKIE = "desk_operator";

/**
 * `DESK_OPERATOR_TOKENS` maps a person to their token:
 *
 *     DESK_OPERATOR_TOKENS="atharva=s3cret-one,ops=s3cret-two"
 *
 * The key becomes the operator id and label, the value is the token they paste
 * into the unlock page. Give each person their own; sharing one defeats the
 * only thing this scheme is good for.
 */
function operatorTable(): Map<string, Operator> {
  const raw = process.env.DESK_OPERATOR_TOKENS ?? "";
  const table = new Map<string, Operator>();

  for (const entry of raw.split(",")) {
    const [id, token] = entry.split("=").map((part) => part.trim());
    if (!id || !token) continue;
    table.set(token, { id, label: id });
  }

  return table;
}

/** Reads one cookie out of a request without pulling in a cookie library. */
function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return decodeURIComponent(part.slice(eq + 1).trim());
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

/** The operator behind this request, or `null` if the token is absent or wrong. */
export function currentOperator(request: Request): Operator | null {
  const presented = readCookie(request, OPERATOR_COOKIE);
  if (!presented) return null;

  // Walk every entry rather than a map lookup, so a valid token and an invalid
  // one take the same path.
  let found: Operator | null = null;
  for (const [token, operator] of operatorTable()) {
    if (secretEquals(token, presented)) found = operator;
  }

  return found;
}

/**
 * Gate a read. Fails open, deliberately — see the note in the body.
 */
export function requireOperatorRead(request: Request): Operator | null {
  const operator = currentOperator(request);
  if (operator) return operator;

  // Reads are open by default, which is exactly as exposed as the console is
  // today — the overview already serves platform-wide figures to anyone who
  // can reach the server. Defaulting to closed instead would lock the console
  // out of any environment that has not set a token, including local dev.
  //
  // This must flip before the console is reachable from anywhere but a
  // laptop: the sections expose far more customer data than the overview
  // does. Set OPERATOR_READ_OPEN=0 to close them.
  if (process.env.OPERATOR_READ_OPEN !== "0") return null;

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
