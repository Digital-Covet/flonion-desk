import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { redirect } from "react-router";
import { clientIp, recordAudit } from "../prisma/audit";
import { db } from "../prisma/db";
import { requireOperator } from "../prisma/operator";
import { toStamp } from "../prisma/time";
import type { Route } from "./+types/impersonate";

/**
 * Impersonation handoff route.
 *
 * Mints a short-lived capability token and redirects the operator to the
 * tenant app, which validates it and creates the session with better-auth's
 * own machinery. This is the pattern from revme-ai/src/lib/review-claim.ts.
 *
 * Guardrails:
 * - POST only (a link in email cannot trigger it)
 * - 60-second token TTL
 * - Single-use nonce (stored in Verification table)
 * - One audit row desk-side
 */
export async function action({ request }: Route.ActionArgs) {
  const operator = requireOperator(request);

  const body = await request.json();
  const userId = body.userId;
  if (typeof userId !== "string" || !userId) {
    return Response.json({ error: "Missing userId" }, { status: 400 });
  }

  // Verify the target user exists
  const user = await db.orm.public.User.where((u) => u.id.eq(userId))
    .select("id", "email")
    .first();
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const tenantUrl = process.env.TENANT_APP_URL;
  const handoffSecret = process.env.OPERATOR_HANDOFF_SECRET;
  if (!tenantUrl || !handoffSecret) {
    return Response.json(
      { error: "Impersonation not configured" },
      { status: 500 },
    );
  }

  // Mint a one-shot token: random nonce + HMAC signature
  const nonce = randomBytes(16).toString("base64url");
  const expiresAt = Date.now() + 60_000; // 60 seconds
  const payload = `${userId}.${expiresAt}.${nonce}`;

  // Sign with the handoff secret (separate from the operator cookie)
  const signature = createHmac("sha256", handoffSecret)
    .update(payload)
    .digest("hex");

  // Store the nonce in the Verification table (one-shot store better-auth
  // cleans up) and audit desk-side, together: no handoff without its audit row.
  // The contract gives `id` and `updatedAt` no defaults, so both are set here.
  await db.transaction(async (tx) => {
    await tx.orm.public.Verification.create({
      id: randomUUID(),
      identifier: `impersonate:${nonce}`,
      value: operator.id,
      expiresAt: toStamp(expiresAt),
      updatedAt: toStamp(Date.now()),
    });
    await recordAudit(tx, operator, {
      action: "user.impersonate",
      entity: "user",
      entityId: userId,
      note: `Impersonating ${user.email}`,
      ip: clientIp(request),
    });
  });

  // Redirect to tenant app with the handoff token
  const handoffUrl = new URL("/operator/impersonate", tenantUrl);
  handoffUrl.searchParams.set("token", payload);
  handoffUrl.searchParams.set("sig", signature);

  return redirect(handoffUrl.toString());
}
