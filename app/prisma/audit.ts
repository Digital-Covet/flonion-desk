import { randomUUID } from "node:crypto";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import type { db } from "./db";
import type { Operator } from "./operator";

/** The handle `db.transaction()` passes to its callback. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Row state captured in `before` / `after`: the `Json` columns' input type. */
type RowState = { [field: string]: JsonValue };

/**
 * Record an operator action in the audit log.
 *
 * This takes the transaction handle, not `db`, so it can only be called inside
 * the same `db.transaction()` as the mutation it describes: the write and its
 * audit row commit together or not at all. `db` is imported for its type only,
 * which keeps this module free of a runtime cycle through the route modules.
 *
 * `before` and `after` capture the full row state so an auditor can see what
 * changed without querying the table again. They are JSON-serialisable
 * objects, not raw Prisma result types.
 */
export async function recordAudit(
  tx: Tx,
  operator: Operator,
  entry: {
    action: string;
    entity: string;
    entityId: string;
    before?: RowState | null;
    after?: RowState | null;
    note?: string | null;
    ip?: string | null;
  },
) {
  // The contract gives `id` no default, so the row's key is minted here.
  await tx.orm.public.AuditLog.create({
    id: randomUUID(),
    operatorId: operator.id,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    note: entry.note ?? null,
    ip: entry.ip ?? null,
  });
}

/**
 * The client address to record against an action.
 *
 * `X-Forwarded-For` is a list the client can seed with anything; only the last
 * entry was appended by the proxy directly in front of this server. With one
 * trusted proxy (the hosting platform), that entry is the real peer.
 */
export function clientIp(request: Request): string | null {
  const hops = request.headers.get("x-forwarded-for")?.split(",") ?? [];
  const last = hops[hops.length - 1]?.trim();
  return last || null;
}
