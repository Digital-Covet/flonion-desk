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
            discoveryUrl:
              "https://iam.digitalcovet.com/.well-known/openid-configuration",
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
