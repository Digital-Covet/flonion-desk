import "dotenv/config";
import { Pool } from "pg";

/**
 * The one pg pool the desk uses, shared by Prisma Next (`db.ts`) and
 * better-auth (`lib/auth.ts`).
 *
 * Every page view pays connection setup (TCP, TLS, Postgres auth: 4-5 round
 * trips to Neon) whenever the pool has nothing idle, so:
 * - one pool, so the session lookup and the section reads share warm
 *   connections instead of each pool doing the setup again;
 * - a long idle timeout, because an operator console sees a click a minute,
 *   and pg's 10-30 s defaults closed everything between clicks;
 * - `max` above the overview's 21 parallel reads, so they run in one wave
 *   instead of queueing behind a 10-connection default;
 * - a connect timeout, because pg's default is to wait forever and a stalled
 *   connect would hold every page's session lookup until the platform kills it.
 *
 * TLS comes from the URL's `sslmode` (pg merges the parsed URL over explicit
 * config), so no `ssl` option is set here.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 25,
  idleTimeoutMillis: 10 * 60_000,
  connectionTimeoutMillis: 5_000,
});

// An idle client can be dropped by the server (Neon suspends idle computes).
// Without a listener pg rethrows that as an uncaught error and kills the process.
pool.on("error", (error) => {
  console.error("[Desk] idle pg client error", error.message);
});
