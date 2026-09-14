import { randomUUID } from "node:crypto";

/**
 * Log a failed section read and return what the client may see.
 *
 * Driver messages can name relations, columns, constraints, and roles, so they
 * stay in the server log. The operator gets a reference to quote instead.
 */
export function readFailure(label: string, cause: unknown): string {
  const ref = randomUUID();
  console.error(`${label} loader failed`, ref, cause);
  return `Database read failed (ref ${ref})`;
}
