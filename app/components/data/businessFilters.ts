/**
 * Business list filters: the shape, how they are read from a URL, and whether
 * any are active.
 *
 * This lives apart from `app/prisma/businesses.ts` for one reason, and it is
 * not organisational tidiness: the filter bar runs in the browser and the
 * query module imports `db`, which imports `dotenv/config`. Anything a
 * component calls from the query module drags the database client into the
 * client bundle, where it fails at import time with "process is not defined".
 *
 * So: pure functions and types only. **Never import `db` from here.**
 */

/** Columns the table can be ordered by. The first is the default. */
export const BUSINESS_SORT_KEYS = [
  "createdAt",
  "name",
  "rating",
  "reviewCount",
  "qrScanCount",
] as const;

export type BusinessSort = (typeof BUSINESS_SORT_KEYS)[number];

/** Filters read from the URL. Every field is optional. */
export interface BusinessFilters {
  /** Free text across name, description, keywords and address. */
  q: string | null;
  sectors: string[];
  minRating: number | null;
  /** "yes" wants a cached Google rating, "no" wants none. */
  hasRating: "yes" | "no" | null;
  /** Whether the owner has claimed a Google place. */
  claimed: "yes" | "no" | null;
  createdWithinDays: number | null;
}

export function readBusinessFilters(url: URL): BusinessFilters {
  const p = url.searchParams;

  const yesNo = (key: string): "yes" | "no" | null => {
    const v = p.get(key);
    return v === "yes" || v === "no" ? v : null;
  };
  const num = (key: string): number | null => {
    const n = Number.parseFloat(p.get(key) ?? "");
    return Number.isFinite(n) ? n : null;
  };
  // Bounded because far past a century `daysAgo` builds an out-of-range Date
  // and throws, which would blank the table behind a read failure.
  const createdWithin = num("createdWithin");

  return {
    q: p.get("q"),
    sectors: p.getAll("sector").filter(Boolean),
    minRating: num("minRating"),
    hasRating: yesNo("hasRating"),
    claimed: yesNo("claimed"),
    createdWithinDays:
      createdWithin !== null && createdWithin >= 0 && createdWithin <= 36_500
        ? createdWithin
        : null,
  };
}

/** True when anything is narrowing the list, so the UI can offer to clear it. */
export function hasActiveFilters(f: BusinessFilters): boolean {
  return (
    Boolean(f.q) ||
    f.sectors.length > 0 ||
    f.minRating !== null ||
    f.hasRating !== null ||
    f.claimed !== null ||
    f.createdWithinDays !== null
  );
}
