import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

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
  return betterAuth({
    baseURL: required("BETTER_AUTH_URL"),
    secret: required("BETTER_AUTH_SECRET"),
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
