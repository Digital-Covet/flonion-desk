// `Timestamp` columns decode to `Temporal.PlainDateTime`, and the codec reads
// the implementation off the global object. Node 26 provides one; the Node
// build Vercel runs does not, so every read there fails with
// RUNTIME.TEMPORAL_UNAVAILABLE. This shim installs a Temporal global only when
// the runtime is missing one, and must run before the client is created.
import "temporal-polyfill/global";
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export const db = postgres<Contract>({
  contractJson,
  url: databaseUrl,
});
