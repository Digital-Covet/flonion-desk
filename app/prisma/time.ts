import type { TimestampString } from "@prisma/orm-postgres/target/codec-types";

/**
 * Timestamp handling for every query module.
 *
 * `Timestamp(3)` columns are bound to the string codec (see the header of
 * `contract.prisma`), so a row's timestamp arrives as a branded string and a
 * cutoff can be handed straight to `.gte()` / `.lte()`. That is the whole point
 * of the codec choice: window maths belongs in SQL, not in JS over a capped
 * fetch of every row in the table.
 *
 * Two rules hold everywhere:
 *
 * 1. **Stored timestamps are naive and mean UTC.** The columns are `timestamp`
 *    without a zone, and the tenant app writes them through Prisma, which sends
 *    UTC. So a stored value is a UTC wall clock, and every conversion here
 *    treats it as one. This matches what the previous Temporal-based code did
 *    when it called `Date.UTC(...)` on the decoded parts.
 *
 * 2. **Cutoffs are written in Postgres' own text format**, `YYYY-MM-DD HH:MM:SS.mmm`,
 *    with no zone suffix. A `Z`-suffixed value would be silently truncated
 *    against a zoneless column rather than converted, which is the kind of bug
 *    that only shows up for operators in a non-UTC timezone.
 */

/** A decoded `Timestamp(3)` column, and the type `.gte()` and friends expect. */
export type Stamp = TimestampString<3>;

const DAY_MS = 86_400_000;

/**
 * Epoch millis to the branded string form a `Timestamp(3)` column compares against.
 *
 * This is the **only** cast in the codebase from a plain string to a `Stamp`. The
 * brand exists to stop arbitrary strings reaching a timestamp comparison; funnelling
 * every cutoff through one audited function keeps that guarantee while still allowing
 * the values the ORM cannot construct itself.
 */
export function toStamp(ms: number): Stamp {
  // "2026-09-10T09:36:06.433Z" -> "2026-09-10 09:36:06.433"
  return new Date(ms).toISOString().replace("T", " ").replace("Z", "") as Stamp;
}

/** A cutoff `days` before `now`, ready to pass to `.gte()`. */
export function daysAgo(days: number, now: number = Date.now()): Stamp {
  return toStamp(now - days * DAY_MS);
}

/**
 * A stored timestamp back to epoch millis, for bucketing and ordering.
 *
 * Accepts either wire form: Postgres' space-separated text output, or an ISO
 * string with a `T`. Both are read as UTC, per rule 1 above.
 */
export function stampToMillis(ts: string): number {
  const iso = ts.includes("T") ? ts : ts.replace(" ", "T");
  return Date.parse(iso.endsWith("Z") ? iso : `${iso}Z`);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * "12 Aug" — a chart bucket label.
 *
 * Formatting stays on the server: the server and the operator's browser can sit
 * in different timezones, and formatting in both would break hydration.
 */
export function formatDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "12 AUG 14:05" — the timestamp under an activity row. */
export function formatStamp(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]?.toUpperCase()} ${hh}:${mm}`;
}

/** "12 Aug 2026" — a date cell in a section table. */
export function formatDate(ts: string): string {
  const d = new Date(stampToMillis(ts));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
