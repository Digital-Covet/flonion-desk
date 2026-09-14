import { useOutletContext } from "react-router";
import { BusinessFilterBar } from "../components/businesses/BusinessFilterBar";
import { BusinessTable } from "../components/businesses/BusinessTable";
import {
  BUSINESS_SORT_KEYS,
  hasActiveFilters,
  readBusinessFilters,
} from "../components/data/businessFilters";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { loadBusinessList } from "../prisma/businesses";
import { readFailure } from "../prisma/loader-error";
import { requireOperatorRead } from "../prisma/operator";
import { readPageParams } from "../prisma/paging";
import type { Route } from "./+types/businesses";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Businesses" },
    {
      name: "description",
      content: "Every business on the Flonion platform.",
    },
  ];
}

/**
 * Filters and paging come from the URL rather than component state, so a
 * narrowed table is a link an operator can send to someone else and the back
 * button does the obvious thing.
 *
 * A failed read is reported rather than thrown, matching the overview: a
 * database outage costs the figures, not the whole screen.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireOperatorRead(request);
  const url = new URL(request.url);
  const filters = readBusinessFilters(url);
  const params = readPageParams(url, BUSINESS_SORT_KEYS);

  try {
    return {
      data: await loadBusinessList(filters, params),
      filters,
      params,
      error: null,
    };
  } catch (cause) {
    return {
      data: null,
      filters,
      params,
      error: readFailure("businesses", cause),
    };
  }
}

export default function Businesses({ loaderData }: Route.ComponentProps) {
  const { data, filters, params, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="Businesses" operator={operator} />

      {data === null ? (
        <SectionError
          title="Businesses unavailable"
          detail="The platform database could not be read, so no rows are shown."
          error={error}
        />
      ) : (
        <>
          <StatRow
            items={[
              { id: "total", label: "Businesses", value: data.stats.total },
              {
                id: "new",
                label: "New in 30 days",
                value: data.stats.newThisMonth,
              },
              {
                id: "claimed",
                label: "Google place claimed",
                value: data.stats.claimed,
              },
              {
                id: "rated",
                label: "Rating cached",
                value: data.stats.withGoogleRating,
              },
            ]}
          />

          <BusinessFilterBar
            filters={filters}
            sectors={data.sectors}
            active={hasActiveFilters(filters)}
          />

          <BusinessTable
            rows={data.page.rows}
            sort={params.sort}
            dir={params.dir}
          />

          <Pagination page={data.page} />
        </>
      )}
    </div>
  );
}
