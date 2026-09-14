import { createHmac, timingSafeEqual } from "node:crypto";
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
 * The response body is irrelevant to the IAM; it only checks the status, so a
 * bad token still returns 200 after the failure is logged, to avoid a broken
 * sign-out loop at the issuer.
 */

const VERIFY_SECRET = process.env.IAM_FRONT_CHANNEL_SECRET ?? "";

interface LogoutTokenPayload {
  sub?: unknown;
}

function verifyLogoutToken(token: string): LogoutTokenPayload | null {
  if (!VERIFY_SECRET || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
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
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as LogoutTokenPayload;
    return typeof decoded.sub === "string" ? decoded : null;
  } catch {
    return null;
  }
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("logout_token");

  if (!token) {
    console.warn("[front-channel-logout] missing logout_token");
    return new Response(null, { status: 400 });
  }

  const payload = verifyLogoutToken(token);
  if (!payload || typeof payload.sub !== "string") {
    console.warn("[front-channel-logout] invalid logout_token");
    return new Response(null, { status: 200 });
  }

  try {
    // `sub` is the IAM user id. Better-auth stores it as `accountId` in the
    // `account` table, whose `userId` is the local id to revoke.
    const accounts = await db.orm.public.Account.where((a) =>
      a.accountId.eq(payload.sub as string),
    ).all();

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