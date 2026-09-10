import { Search, X } from "lucide-react";
import { Form, Link } from "react-router";
import {
  CARD,
  COLORS,
  FONT_BOLD,
  FONT_REGULAR,
  OUTLINE_STROKE_WIDTH,
  TEXT_LABEL,
} from "../constants";
import type { BusinessFilters } from "../data/businessFilters";
import type { SectorFacet } from "../types";

/**
 * Filters for the Businesses table.
 *
 * A GET form, so submitting writes the filters into the URL and the loader
 * reads them back. That is what makes a filtered view shareable and the back
 * button behave. It also means no client state to keep in sync with the query
 * that produced the rows.
 *
 * Submitting resets to page one: the old offset describes a result set that no
 * longer exists.
 */
export function BusinessFilterBar({
  filters,
  sectors,
  active,
}: {
  filters: BusinessFilters;
  sectors: SectorFacet[];
  active: boolean;
}) {
  const field = `${FONT_REGULAR} text-[13px] text-[#2D3748] bg-white rounded-[10px] px-3 py-2 border outline-none`;
  const borderStyle = { borderColor: COLORS.border };

  return (
    <Form method="get" className={`${CARD} p-4 mb-4`}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <span className={`${TEXT_LABEL} uppercase`}>Search</span>
          <span
            className="flex items-center gap-2 bg-white rounded-[10px] px-3 py-2 border"
            style={borderStyle}
          >
            <Search
              size={15}
              color={COLORS.textMuted}
              strokeWidth={OUTLINE_STROKE_WIDTH}
            />
            <input
              type="search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Name, description, keywords or address"
              className={`${FONT_REGULAR} text-[13px] text-[#2D3748] bg-transparent outline-none w-full placeholder:text-[#A0AEC0]`}
            />
          </span>
        </label>

        <label className="flex flex-col gap-1 min-w-[160px]">
          <span className={`${TEXT_LABEL} uppercase`}>Sector</span>
          <select
            name="sector"
            defaultValue={filters.sectors[0] ?? ""}
            className={field}
            style={borderStyle}
          >
            <option value="">Any sector</option>
            {sectors.map((s) => (
              <option key={s.sector} value={s.sector}>
                {s.sector} ({s.count})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 min-w-[130px]">
          <span className={`${TEXT_LABEL} uppercase`}>Min rating</span>
          <select
            name="minRating"
            defaultValue={filters.minRating?.toString() ?? ""}
            className={field}
            style={borderStyle}
          >
            <option value="">Any</option>
            <option value="3">3.0 and up</option>
            <option value="4">4.0 and up</option>
            <option value="4.5">4.5 and up</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 min-w-[150px]">
          <span className={`${TEXT_LABEL} uppercase`}>Google rating</span>
          <select
            name="hasRating"
            defaultValue={filters.hasRating ?? ""}
            className={field}
            style={borderStyle}
          >
            <option value="">Any</option>
            <option value="yes">Cached</option>
            <option value="no">Not cached</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 min-w-[150px]">
          <span className={`${TEXT_LABEL} uppercase`}>Google place</span>
          <select
            name="claimed"
            defaultValue={filters.claimed ?? ""}
            className={field}
            style={borderStyle}
          >
            <option value="">Any</option>
            <option value="yes">Claimed</option>
            <option value="no">Unclaimed</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 min-w-[140px]">
          <span className={`${TEXT_LABEL} uppercase`}>Created</span>
          <select
            name="createdWithin"
            defaultValue={filters.createdWithinDays?.toString() ?? ""}
            className={field}
            style={borderStyle}
          >
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className={`${FONT_BOLD} text-[12px] text-white rounded-[10px] px-4 py-2.5`}
            style={{ backgroundColor: COLORS.teal }}
          >
            Apply
          </button>
          {active ? (
            <Link
              to="/businesses"
              className={`${FONT_BOLD} text-[12px] rounded-[10px] px-3 py-2.5 inline-flex items-center gap-1`}
              style={{ color: COLORS.textMuted }}
            >
              <X size={14} color={COLORS.textMuted} />
              Clear
            </Link>
          ) : null}
        </div>
      </div>
    </Form>
  );
}
