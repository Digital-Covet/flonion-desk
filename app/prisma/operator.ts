import { getAuth } from "../lib/auth";

/**
 * The single gate every operator read and write passes through.
 *
 * Authentication is delegated to the Digital Covet IAM via better-auth OAuth.
 * This module resolves the better-auth session cookie (set after OAuth login)
 * into an `Operator` identity used for audit logging and access control.
 *
 * Every loader and action under the console calls `requireOperatorRead` or
 * `requireOperator` before touching the database. A layout loader cannot do it
 * for them: React Router runs matched loaders in parallel, and a single-fetch
 * request runs only the loaders it names.
 */

/** Who performed an action. */
export interface Operator {
  id: string;
  label: string;
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * Resolve the current operator from the better-auth session cookie.
 *
 * Returns `null` when no session is present, expired, or invalid.
 */
export async function currentOperator(request: Request): Promise<Operator | null> {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) return null;
    return {
      id: session.user.id,
      label: session.user.name ?? session.user.email ?? "Unknown",
    };
  } catch {
    return null;
  }
}

/**
 * Gate a read. Fails closed.
 *
 * Local development can opt out with `OPERATOR_READ_OPEN=1`, which is ignored
 * in production. The return value is `null` only in that case.
 */
export async function requireOperatorRead(
  request: Request,
): Promise<Operator | null> {
  const operator = await currentOperator(request);
  if (operator) return operator;

  if (process.env.OPERATOR_READ_OPEN === "1" && !isProduction) return null;

  throw new Response("Operator session required", { status: 403 });
}

/**
 * Gate a write. Always fails closed.
 *
 * There is no development bypass on purpose. A write from this console edits
 * live customer data, so an unconfigured environment must not be able to make
 * one.
 */
export async function requireOperator(request: Request): Promise<Operator> {
  const operator = await currentOperator(request);
  if (operator) return operator;

  throw new Response("Operator session required", { status: 403 });
}
