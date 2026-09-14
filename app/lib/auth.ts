import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "desk",
          clientId: process.env.OAUTH_CLIENT_ID_DESK || "desk",
          clientSecret: process.env.OAUTH_CLIENT_SECRET_DESK || "",
          discoveryUrl:
            "https://iam.digitalcovet.com/.well-known/openid-configuration",
        },
      ],
    }),
  ],
});
