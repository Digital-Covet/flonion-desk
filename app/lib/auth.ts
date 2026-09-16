import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { Pool } from "pg";

/**
 * better-auth for the operator sign-in flow.
 *
 * Authentication is delegated to the Digital Covet IAM via OAuth (provider:
 * "desk"). After a successful callback, better-auth creates a session cookie
 * that `prisma/operator.ts` reads to resolve the current operator.
 *
 * The instance is built on first use and refuses to build with any setting
 * missing, so a misconfigured deployment fails loudly on `/api/auth/*` instead
 * of signing OAuth state with better-auth's public default secret.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function createAuth() {
  // The IAM (iam-digitalcovet, @better-auth/oauth-provider) does not serve a
  // usable OIDC discovery document: `/.well-known/openid-configuration` on
  // the IAM root returns the marketing page (HTML), so genericOAuth's
  // discovery fetch yields no endpoints and the provider is silently skipped
  // at init - every sign-in then fails with PROVIDER_NOT_FOUND. Point at the
  // OAuth2 endpoints explicitly instead of relying on discovery.
  const iamBaseUrl =
    process.env.IAM_BASE_URL?.replace(/\/$/, "") ||
    "https://iam.digitalcovet.com";
  const databaseUrl = required("DATABASE_URL");
  // Per-process pg pool passed directly as better-auth `database`
  // (supported pattern per better-auth Postgres adapter docs). The desk
  // otherwise uses Prisma Next (`app/prisma/db.ts`); better-auth needs a
  // persistent store for Session/Account/Verification rows, without which
  // `getSession()` is always null and every `/` load bounces to /login.
  // Tables (`user`, `session`, `account`, `verification` via @@map) already
  // match better-auth's expected schema, so pool writes stay compatible
  // with the Prisma Next reads in `front-channel-logout.ts` / `operator.ts`.
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    // Neon pooler URLs carry sslmode; pg needs explicit TLS in serverless.
    ssl: databaseUrl.includes("sslmode=")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  return betterAuth({
    baseURL: required("BETTER_AUTH_URL"),
    secret: required("BETTER_AUTH_SECRET"),
    trustedOrigins: ["https://desk.flonion.com", "http://localhost:3000"],
    database: pool,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "desk",
            clientId: required("OAUTH_CLIENT_ID_DESK"),
            clientSecret: required("OAUTH_CLIENT_SECRET_DESK"),
            authorizationUrl: `${iamBaseUrl}/api/auth/oauth2/authorize`,
            tokenUrl: `${iamBaseUrl}/api/auth/oauth2/token`,
            userInfoUrl: `${iamBaseUrl}/api/auth/oauth2/userinfo`,
            scopes: ["openid", "profile", "email", "offline_access"],
            pkce: true,
            responseType: "code",
            // IAM returns OIDC claims ({sub, name, email, email_verified...}),
            // not {id}. Map them explicitly; without this the callback fails
            // with `unable_to_get_user_info` and bounces to /login.
            mapProfileToUser: (profile: any) => ({
              email: String(profile.email ?? ""),
              name: String(
                profile.name ??
                  profile.given_name ??
                  profile.email ??
                  "Operator",
              ),
              image:
                typeof profile.picture === "string"
                  ? profile.picture
                  : undefined,
              emailVerified:
                profile.email_verified === true ||
                profile.emailVerified === true,
            }),
            accountSubject: ({ profile }: any) =>
              String(profile.sub ?? profile.id ?? ""),
            // Redacted diagnostics: confirms token present + userinfo status
            // without leaking tokens or PII into Vercel logs.
            getUserInfo: async (tokens: any) => {
              const hasAccess = !!tokens.accessToken;
              console.log("[Desk] userinfo fetch", { hasAccess });
              const res = await fetch(
                `${iamBaseUrl}/api/auth/oauth2/userinfo`,
                {
                  headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                  },
                },
              );
              console.log("[Desk] userinfo status", {
                status: res.status,
                ok: res.ok,
              });
              if (!res.ok) {
                const body = await res.text().catch(() => "");
                console.error("[Desk] userinfo FAILED", {
                  status: res.status,
                  body: body.slice(0, 300),
                });
                return null;
              }
              return (await res.json()) as any;
            },
          },
        ],
      }),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}
