/**
 * Pagination, sorting, filter and search-term handling shared by every section
 * list.
 *
 * Section loaders read their parameters from the URL rather than component
 * state, so a filtered table is a link an operator can send to someone else and
 * the browser's back button does the obvious thing. Everything here is pure:
 * it turns `URLSearchParams` into validated values and never touches the
 * database.
 */

/** Rows per page when the URL does not say otherwise. */
const DEFAULT_SIZE = 25;

/**
 * Hard ceiling on rows per page.
 *
 * `size` arrives from the URL, so without a clamp anyone could ask a
 * cross-tenant table for every row at once.
 */
const MAX_SIZE = 100;

/**
 * Hard ceiling on the page number.
 *
 * Far enough out, `(page - 1) * size` overflows Postgres' `OFFSET` and the read
 * fails. No section is anywhere near this many pages.
 */
const MAX_PAGE = 1_000_000;

/**
 * Longest "created within N days" window a filter accepts.
 *
 * Far enough past this, `daysAgo` builds a `Date` outside the range JS can
 * represent and `toISOString()` throws.
 */
const MAX_WINDOW_DAYS = 36_500;

export type SortDir = "asc" | "desc";

/** Validated paging state for one list request. */
export interface PageParams<TSort extends string> {
  page: number;
  size: number;
  sort: TSort;
  dir: SortDir;
  /** Rows to skip, derived from `page` and `size`. */
  offset: number;
}

/** One page of rows plus what the pager needs to draw itself. */
export interface PageResult<TRow> {
  rows: TRow[];
  /** Total matching the filters, not the number of rows on this page. */
  total: number;
  page: number;
  size: number;
  pageCount: number;
}

function toInt(raw: string | null, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Read paging state out of a request URL.
 *
 * `sortKeys` is the allowlist of columns a section can be ordered by. An
 * unrecognised `sort` falls back to the first key rather than erroring: the
 * value reaches us from the URL, and a stale bookmark should render a sensible
 * page, not a 500.
 */
export function readPageParams<const TSort extends string>(
  url: URL,
  sortKeys: readonly TSort[],
  defaultDir: SortDir = "desc",
  defaultSize: number = DEFAULT_SIZE,
): PageParams<TSort> {
  const params = url.searchParams;

  const page = Math.min(MAX_PAGE, Math.max(1, toInt(params.get("page"), 1)));
  const size = Math.min(
    MAX_SIZE,
    Math.max(1, toInt(params.get("size"), defaultSize)),
  );

  const requested = params.get("sort") as TSort | null;
  const sort =
    requested && sortKeys.includes(requested)
      ? requested
      : (sortKeys[0] as TSort);

  const dir: SortDir = params.get("dir") === "asc" ? "asc" : defaultDir;

  return { page, size, sort, dir, offset: (page - 1) * size };
}

/**
 * Read an optional integer filter out of the URL.
 *
 * A missing, non-integer or out-of-range value reads as `null`, so a
 * hand-edited link drops the filter instead of sending `NaN` towards the
 * database and blanking the section behind a read failure.
 */
export function readIntParam(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
): number | null {
  const raw = params.get(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/** A "created within N days" filter, bounded so `daysAgo` cannot throw. */
export function readWindowDays(
  params: URLSearchParams,
  key = "createdWithinDays",
): number | null {
  return readIntParam(params, key, 0, MAX_WINDOW_DAYS);
}

/** Wrap a fetched page and its total count for the pager component. */
export function pageResult<TRow, TSort extends string>(
  rows: TRow[],
  total: number,
  params: PageParams<TSort>,
): PageResult<TRow> {
  return {
    rows,
    total,
    page: params.page,
    size: params.size,
    pageCount: Math.max(1, Math.ceil(total / params.size)),
  };
}

/**
 * Turn operator input into a safe `ILIKE` pattern.
 *
 * `%` and `_` are wildcards to Postgres, so a search for a literal `%` would
 * otherwise match every row. Backslash is escaped first, because it is the
 * escape character itself and doing it second would double-escape the ones
 * this function adds.
 *
 * Returns `null` for an empty term so callers can skip the clause entirely
 * rather than filtering on `%%`.
 */
export function likeTerm(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const escaped = trimmed
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");

  return `%${escaped}%`;
}
