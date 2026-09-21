import { X } from "lucide-react";
import { Form, Link } from "react-router";
import { CARD, COLORS, FONT_BOLD } from "../constants";
import type { BusinessFilters } from "../data/businessFilters";
import type { SectorFacet } from "../types";
import { FilterSelect, SearchField } from "../ui/FilterSelect";

/**
 * Filters for the Businesses table.
 *
 * A GET form, so submitting writes the filters into the URL and the loader
 * reads them back. That is what makes a filtered view shareable and the back
 * button behave. It also means no client state to keep in sync with the query
 * that produced the rows.
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
  return (
    <Form method="get" className={`${CARD} p-4 mb-4`}>
      <div className="flex flex-wrap items-end gap-3">
        <SearchField
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Name, description, keywords or address"
          label="Search"
        />

        <FilterSelect
          name="sector"
          label="Sector"
          defaultValue={filters.sectors[0] ?? ""}
          placeholder="Any sector"
          options={sectors.map((s) => ({
            value: s.sector,
            label: `${s.sector} (${s.count})`,
          }))}
        />

        <FilterSelect
          name="minRating"
          label="Min rating"
          defaultValue={filters.minRating?.toString() ?? ""}
          placeholder="Any"
          options={[
            { value: "3", label: "3.0 and up" },
            { value: "4", label: "4.0 and up" },
            { value: "4.5", label: "4.5 and up" },
          ]}
        />

        <FilterSelect
          name="hasRating"
          label="Google rating"
          defaultValue={filters.hasRating ?? ""}
          placeholder="Any"
          options={[
            { value: "yes", label: "Cached" },
            { value: "no", label: "Not cached" },
          ]}
        />

        <FilterSelect
          name="claimed"
          label="Google place"
          defaultValue={filters.claimed ?? ""}
          placeholder="Any"
          options={[
            { value: "yes", label: "Claimed" },
            { value: "no", label: "Unclaimed" },
          ]}
        />

        <FilterSelect
          name="moderation"
          label="Moderation"
          defaultValue={filters.moderation ?? ""}
          placeholder="Any"
          options={[
            { value: "active", label: "Active & listed" },
            { value: "suspended", label: "Suspended" },
            { value: "hidden", label: "Hidden from marketplace" },
          ]}
        />

        <FilterSelect
          name="createdWithin"
          label="Created"
          defaultValue={filters.createdWithinDays?.toString() ?? ""}
          placeholder="Any time"
          options={[
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
          ]}
        />

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
