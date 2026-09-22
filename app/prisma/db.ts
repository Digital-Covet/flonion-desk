// `Timestamp` columns decode to `Temporal.PlainDateTime`, and the codec reads
// the implementation off the global object. Node 26 provides one; the Node
// build Vercel runs does not, so every read there fails with
// RUNTIME.TEMPORAL_UNAVAILABLE. This shim installs a Temporal global only when
// the runtime is missing one, and must run before the client is created.
import "temporal-polyfill/global";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };
import { pool } from "./pool";

export const db = postgres<Contract>({
  contractJson,
  // The runtime pins an older @types/pg than the app's; the Pool is the same
  // `pg` class at runtime, only the declarations differ.
  pg: pool as unknown as NonNullable<Parameters<typeof postgres>[0]["pg"]>,
});
