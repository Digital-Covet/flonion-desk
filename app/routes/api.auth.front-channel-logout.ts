import { createHmac, timingSafeEqual } from "node:crypto";
import { DESK_PROVIDER_ID } from "../lib/auth";
import { db } from "../prisma/db";

/**
 * Receives a single front-channel logout notification from the Digital Covet
 * IAM when a user's session ends there.
 *
 * The IAM GETs this path with a `logout_token` query parameter: an HS256 JWT
 * signed with the IAM's `BETTER_AUTH_SECRET` (configured here as
 * `IAM_FRONT_CHANNEL_SECRET`). We verify it, map the token's `sub` (the IAM
 * user id) to a local user via the `account` table, and revoke that user's
 * local sessions. The desk session cookie is signed with our own
 * `BETTER_AUTH_SECRET`, so an invalid token cannot be used to force logouts.
 *
 * A valid signature is not enough on its own. The token travels in a URL, so it
 * can surface in proxy logs and history, and replaying it would sign the user
 * out again on every request. The IAM signs `iss`, `iat`, `jti` and a logout
 * `events` claim but sets no `exp` or `aud` (iam-digitalcovet,
 * `src/lib/front-channel-logout.ts`), so freshness is judged from `iat` and each
 * `jti` is accepted once.
 *
 * The response body is irrelevant to the IAM; it only checks the status, so a
 * bad token still returns 200 after the failure is logged, to avoid a broken
 * sign-out loop at the issuer.
 */

const VERIFY_SECRET = process.env.IAM_FRONT_CHANNEL_SECRET ?? "";

/**
 * The IAM's `iss`: its `BETTER_AUTH_URL` followed by `/api/auth`. Set
 * `IAM_ISSUER` when desk is paired with an IAM other than production.
 */
const EXPECTED_ISSUER =
  process.env.IAM_ISSUER || "https://iam.digitalcovet.com/api/auth";

const LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

/**
 * How old a token may be, in seconds. The IAM sends it at the moment of
 * sign-out with a five-second timeout, so anything older is a replay.
 */
const MAX_TOKEN_AGE_S = 300;

/** Tolerance for the IAM's clock running ahead of ours, in seconds. */
const CLOCK_SKEW_S = 60;

/**
 * `jti`s already accepted, each mapped to the epoch second after which its
 * token fails the age check anyway and the entry can be dropped.
 *
 * Held per process: behind several desk instances a token could be replayed
 * once per instance, still only within `MAX_TOKEN_AGE_S`.
 */
const acceptedTokenIds = new Map<string, number>();

interface LogoutTokenHeader {
  alg?: unknown;
}

interface LogoutTokenPayload {
  sub?: unknown;
  iss?: unknown;
  iat?: unknown;
  jti?: unknown;
  events?: unknown;
}

type Verification = { ok: true; sub: string } | { ok: false; reason: string };

function decodeSegment<T>(segment: string): T | null {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Record `jti` as used. Returns false when it already was. */
function acceptOnce(jti: string, iat: number, now: number): boolean {
  for (const [id, forgetAt] of acceptedTokenIds) {
    if (forgetAt < now) acceptedTokenIds.delete(id);
  }
  if (acceptedTokenIds.has(jti)) return false;
  acceptedTokenIds.set(jti, iat + MAX_TOKEN_AGE_S);
  return true;
}

function verifyLogoutToken(token: string): Verification {
  if (!VERIFY_SECRET) return { ok: false, reason: "no verify secret" };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [encodedHeader, encodedPayload, presentedSignature] = parts as [
    string,
    string,
    string,
  ];

  const expectedSignature = createHmac("sha256", VERIFY_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  const a = Buffer.from(expectedSignature, "ascii");
  const b = Buffer.from(presentedSignature, "ascii");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad signature" };
  }

  // The signature only means something for the algorithm it was computed with.
  const header = decodeSegment<LogoutTokenHeader>(encodedHeader);
  if (header?.alg !== "HS256") return { ok: false, reason: "unexpected alg" };

  const payload = decodeSegment<LogoutTokenPayload>(encodedPayload);
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "malformed payload" };
  }
  const { sub, iss, iat, jti, events } = payload;

  if (typeof sub !== "string" || !sub) return { ok: false, reason: "no sub" };
  if (iss !== EXPECTED_ISSUER) return { ok: false, reason: "wrong issuer" };
  if (
    typeof events !== "object" ||
    events === null ||
    !(LOGOUT_EVENT in events)
  ) {
    return { ok: false, reason: "not a logout event" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    typeof iat !== "number" ||
    now - iat > MAX_TOKEN_AGE_S ||
    iat - now > CLOCK_SKEW_S
  ) {
    return { ok: false, reason: "stale or future iat" };
  }

  if (typeof jti !== "string" || !jti) return { ok: false, reason: "no jti" };
  if (!acceptOnce(jti, iat, now)) return { ok: false, reason: "replayed jti" };

  return { ok: true, sub };
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("logout_token");

  if (!token) {
    console.warn("[front-channel-logout] missing logout_token");
    return new Response(null, { status: 400 });
  }

  const verification = verifyLogoutToken(token);
  if (!verification.ok) {
    console.warn(
      `[front-channel-logout] rejected logout_token: ${verification.reason}`,
    );
    return new Response(null, { status: 200 });
  }
  const { sub } = verification;

  try {
    // `sub` is the IAM user id. Better-auth stores it as `accountId` in the
    // `account` table, whose `userId` is the local id to revoke. The table is
    // shared with the tenant app, where `accountId` holds other providers'
    // subjects, so only the desk's own provider is matched.
    const accounts = await db.orm.public.Account.where((a) =>
      a.accountId.eq(sub),
    )
      .where((a) => a.providerId.eq(DESK_PROVIDER_ID))
      .all();

    const revocations = accounts.map(async (account) => {
      await db.orm.public.Session.where((s) =>
        s.userId.eq(account.userId),
      ).delete();
    });
    await Promise.all(revocations);

    console.log(
      `[front-channel-logout] revoked sessions for ${accounts.length} local account(s)`,
    );
  } catch (error) {
    console.error(
      "[front-channel-logout] session revocation failed:",
      error instanceof Error ? error.message : error,
    );
  }

  return new Response(null, { status: 200 });
}
