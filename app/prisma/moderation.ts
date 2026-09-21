import { or } from "@prisma/orm-postgres/orm-client";
import { clientIp, recordAudit, type Tx } from "./audit";
import { db } from "./db";
import type { Operator } from "./operator";
import { type Stamp, toStamp } from "./time";

/**
 * Moderation writes shared by more than one section.
 *
 * Banning a user is reachable from Users, Reviews ("ban reviewer") and Meetings
 * ("ban requester"), and business moderation from Businesses, a business's
 * detail page and Marketplace. Each helper takes the transaction handle so the
 * change and its audit row commit together, the same contract as `recordAudit`.
 *
 * Enforcement lives in the tenant app (revme-ai): a banned user's session is
 * refused on the next request, a suspended business's members are sent to
 * `/suspended`, and a suspended or hidden business drops out of the public
 * surfaces. Deleting the sessions here makes a ban take effect immediately
 * rather than whenever better-auth next re-reads the user.
 */

/**
 * The request body as a plain object, whichever encoding the UI used.
 *
 * Row menus submit JSON, but a plain `<Form>` posts form data; accepting both
 * keeps an action from failing on the encoding rather than the input.
 */
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const parsed: unknown = await request.json().catch(() => null);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  }
  const form = await request.formData();
  const out: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** A trimmed, length-capped free-text field, or null when blank or absent. */
export function readText(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Ban lengths the dialog offers. Anything else is refused, not guessed at. */
const BAN_DURATIONS_DAYS: Record<string, number | null> = {
  "1": 1,
  "7": 7,
  "30": 30,
  permanent: null,
};

/**
 * `banExpires` for a requested duration: a stamp, null for permanent, or
 * undefined when the input is not one of the offered lengths.
 */
export function banExpiry(duration: unknown): Stamp | null | undefined {
  const key = duration === undefined ? "permanent" : String(duration);
  if (!(key in BAN_DURATIONS_DAYS)) return undefined;
  const days = BAN_DURATIONS_DAYS[key];
  return days === null ? null : toStamp(Date.now() + days * 86_400_000);
}

export async function banUser(
  tx: Tx,
  operator: Operator,
  user: { id: string; banned: boolean | null },
  input: { reason: string | null; expiresAt: Stamp | null; ip: string | null },
) {
  const now = toStamp(Date.now());
  await tx.orm.public.User.where((u) => u.id.eq(user.id)).update({
    banned: true,
    banReason: input.reason,
    banExpires: input.expiresAt,
    updatedAt: now,
  });
  // The tenant app refuses a banned user's session anyway; deleting the rows
  // makes the ban immediate and leaves nothing to resume once it lapses.
  await tx.orm.public.Session.where((s) => s.userId.eq(user.id)).delete();
  await recordAudit(tx, operator, {
    action: "user.ban",
    entity: "user",
    entityId: user.id,
    before: { banned: user.banned ?? false },
    after: {
      banned: true,
      banReason: input.reason,
      banExpires: input.expiresAt,
    },
    ip: input.ip,
  });
}

export async function unbanUser(
  tx: Tx,
  operator: Operator,
  user: { id: string; banned: boolean | null },
  ip: string | null,
) {
  await tx.orm.public.User.where((u) => u.id.eq(user.id)).update({
    banned: false,
    banReason: null,
    banExpires: null,
    updatedAt: toStamp(Date.now()),
  });
  await recordAudit(tx, operator, {
    action: "user.unban",
    entity: "user",
    entityId: user.id,
    before: { banned: user.banned ?? false },
    after: { banned: false },
    ip,
  });
}

/** Intents `handleBusinessModeration` answers. Routes delegate these to it. */
export const BUSINESS_MODERATION_INTENTS = new Set([
  "suspend-business",
  "unsuspend-business",
  "hide-from-marketplace",
  "show-in-marketplace",
  "ban-owner",
]);

/**
 * One handler for business moderation, so Businesses, the detail page and
 * Marketplace cannot drift apart in what "suspend" means.
 */
export async function handleBusinessModeration(
  request: Request,
  operator: Operator,
  body: Record<string, unknown>,
): Promise<Response | { ok: true }> {
  const intent = String(body.intent ?? "");
  const businessId = typeof body.businessId === "string" ? body.businessId : "";
  const ip = clientIp(request);

  const b = await db.orm.public.Business.where((x) => x.id.eq(businessId))
    .select(
      "id",
      "name",
      "userId",
      "status",
      "suspendReason",
      "marketplaceHidden",
    )
    .first();
  if (!b) {
    return Response.json({ error: "Business not found" }, { status: 404 });
  }

  const now = toStamp(Date.now());
  const reason = readText(body.reason);

  switch (intent) {
    case "suspend-business": {
      if (!reason) {
        return Response.json(
          { error: "A reason is required to suspend a business" },
          { status: 400 },
        );
      }
      const banMembers = body.banMembers === true || body.banMembers === "on";
      // Owner first, then team members. Only read when they are to be banned.
      const members = banMembers
        ? await db.orm.public.User.where((u) =>
            or(u.id.eq(b.userId), u.businessId.eq(b.id)),
          )
            .select("id", "banned")
            .all()
        : [];

      await db.transaction(async (tx) => {
        await tx.orm.public.Business.where((x) => x.id.eq(b.id)).update({
          status: "suspended",
          suspendReason: reason,
          suspendedById: operator.id,
          suspendedAt: now,
          updatedAt: now,
        });
        await recordAudit(tx, operator, {
          action: "business.suspend",
          entity: "business",
          entityId: b.id,
          before: { status: b.status, suspendReason: b.suspendReason },
          after: { status: "suspended", suspendReason: reason },
          note: banMembers
            ? `Suspended "${b.name}" and banned ${members.length} member(s)`
            : `Suspended "${b.name}"`,
          ip,
        });
        for (const m of members) {
          await banUser(tx, operator, m, {
            reason: `Business suspended: ${reason}`,
            expiresAt: null,
            ip,
          });
        }
      });
      return { ok: true };
    }

    case "unsuspend-business": {
      // Bans placed alongside a suspension stay: lifting them is a separate,
      // per-user decision made on the Users page.
      await db.transaction(async (tx) => {
        await tx.orm.public.Business.where((x) => x.id.eq(b.id)).update({
          status: "active",
          suspendReason: null,
          suspendedById: null,
          suspendedAt: null,
          updatedAt: now,
        });
        await recordAudit(tx, operator, {
          action: "business.unsuspend",
          entity: "business",
          entityId: b.id,
          before: { status: b.status, suspendReason: b.suspendReason },
          after: { status: "active" },
          note: reason,
          ip,
        });
      });
      return { ok: true };
    }

    case "hide-from-marketplace":
    case "show-in-marketplace": {
      const hidden = intent === "hide-from-marketplace";
      await db.transaction(async (tx) => {
        await tx.orm.public.Business.where((x) => x.id.eq(b.id)).update({
          marketplaceHidden: hidden,
          updatedAt: now,
        });
        await recordAudit(tx, operator, {
          action: hidden
            ? "business.marketplace_hide"
            : "business.marketplace_show",
          entity: "business",
          entityId: b.id,
          before: { marketplaceHidden: b.marketplaceHidden },
          after: { marketplaceHidden: hidden },
          note: reason,
          ip,
        });
      });
      return { ok: true };
    }

    case "ban-owner": {
      const expiresAt = banExpiry(body.duration);
      if (expiresAt === undefined) {
        return Response.json({ error: "Invalid ban length" }, { status: 400 });
      }
      const owner = await db.orm.public.User.where((u) => u.id.eq(b.userId))
        .select("id", "banned")
        .first();
      if (!owner) {
        return Response.json({ error: "Owner not found" }, { status: 404 });
      }
      await db.transaction(async (tx) => {
        await banUser(tx, operator, owner, { reason, expiresAt, ip });
      });
      return { ok: true };
    }

    default:
      return Response.json(
        { error: `Unknown intent: ${intent}` },
        { status: 400 },
      );
  }
}
