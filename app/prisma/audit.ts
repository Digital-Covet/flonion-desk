import type { Operator } from "./operator";

/**
 * Record an operator action in the audit log.
 *
 * This MUST be called inside the same `db.transaction()` as the mutation it
 * describes, so a write cannot land unlogged. The transaction handle is passed
 * in rather than imported, because importing `db` here would create a cycle
 * through the route modules and, more importantly, would let a caller skip
 * the transaction boundary.
 *
 * `before` and `after` capture the full row state so an auditor can see what
 * changed without querying the table again. They are JSON-serialisable
 * objects, not raw Prisma result types.
 */
export async function recordAudit(
  operator: Operator,
  entry: {
    action: string;
    entity: string;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    note?: string | null;
    ip?: string | null;
  },
  tx: { auditLog: { create: (data: unknown) => Promise<unknown> } },
) {
  await tx.auditLog.create({
    data: {
      operatorId: operator.id,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before ?? null,
      after: entry.after ?? null,
      note: entry.note ?? null,
      ip: entry.ip ?? null,
    },
  });
}
