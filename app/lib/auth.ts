import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

/**
 * better-auth for the operator sign-in flow.
 *
 * This is NOT an authorization gate. Nothing resolves a session into an
 * operator; every read and write is still gated by `prisma/operator.ts`.
 * Before wiring `getSession` into that gate, give this a database adapter and
 * map sessions to an explicit allowlist of operator subjects, or any account
 * the IAM issues becomes an operator.
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
