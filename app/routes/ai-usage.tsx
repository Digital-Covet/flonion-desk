import { Link, useOutletContext } from "react-router";
import { AiUsageBusinessTable } from "../components/ai-usage/AiUsageBusinessTable";
import {
  FONT_BOLD,
  FONT_REGULAR,
  TEXT_MUTED_SM,
} from "../components/constants";
import { UNATTRIBUTED } from "../components/data/aiUsage";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { FilterSelect, SearchField } from "../components/ui/FilterSelect";
import { AI_USAGE_SORT_KEYS, loadAiUsageList } from "../prisma/ai-usage";
import { readFailure } from "../prisma/loader-error";
import { requireOperatorRead } from "../prisma/operator";
import { readPageParams, readWindowDays } from "../prisma/paging";
import type { Route } from "./+types/ai-usage";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — AI Usage" },
    { name: "description", content: "LLM usage ledger across all tenants." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireOperatorRead(request);
  const url = new URL(request.url);
  const params = readPageParams(url, AI_USAGE_SORT_KEYS);

  const filters = {
    endpoint: url.searchParams.get("endpoint"),
    stage: url.searchParams.get("stage"),
    model: url.searchParams.get("model"),
    ok: url.searchParams.get("ok") as "yes" | "no" | null,
    userId: url.searchParams.get("userId"),
    businessId: url.searchParams.get("businessId"),
    createdWithinDays: readWindowDays(url.searchParams),
  };

  try {
    return {
      data: await loadAiUsageList(filters, params),
      filters,
      params,
      error: null,
    };
  } catch (cause) {
    return {
      data: null,
      filters,
      params,
      error: readFailure("ai-usage", cause),
    };
  }
}

export default function AiUsage({ loaderData }: Route.ComponentProps) {
  const { data, filters, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  const selectedBusiness = data?.byBusiness.find(
    (b) => (b.businessId ?? UNATTRIBUTED) === filters.businessId,
  );
  const clearBusinessHref = (() => {
    const next = new URLSearchParams();
    for (const key of ["endpoint", "model", "createdWithinDays"] as const) {
      const v = filters[key];
      if (v !== null && v !== "") next.set(key, String(v));
    }
    const qs = next.toString();
    return qs ? `?${qs}` : "?";
  })();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="AI Usage" operator={operator} />

      {data === null ? (
        <SectionError
          title="AI Usage unavailable"
          detail="The platform database could not be read."
          error={error}
        />
      ) : (
        <>
          <StatRow
            items={[
              { id: "total", label: "Total calls", value: data.stats.total },
              {
                id: "success",
                label: "Success rate",
                value: data.stats.successRate,
              },
              {
                id: "cost",
                label: "Total cost",
                value: Math.round(data.stats.totalCost * 100) / 100,
              },
              {
                id: "p50",
                label: "p50 latency",
                value: data.stats.p50Latency,
              },
              {
                id: "p95",
                label: "p95 latency",
                value: data.stats.p95Latency,
              },
              {
                id: "ratelimit",
                label: "Rate-limited",
                value: data.stats.rateLimitRejections,
              },
            ]}
          />

          <FilterBar
            active={Boolean(
              filters.endpoint ||
                filters.model ||
                filters.businessId ||
                filters.createdWithinDays !== null,
            )}
          >
            <SearchField
              name="endpoint"
              defaultValue={filters.endpoint ?? ""}
              placeholder="Endpoint..."
              label="Endpoint"
            />
            <SearchField
              name="model"
              defaultValue={filters.model ?? ""}
              placeholder="Model..."
              label="Model"
            />
            <FilterSelect
              name="createdWithinDays"
              label="Period"
              defaultValue={
                filters.createdWithinDays === null
                  ? ""
                  : String(filters.createdWithinDays)
              }
              placeholder="All time"
              options={[
                { value: "1", label: "Last 24 hours" },
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
              ]}
            />
            {filters.businessId ? (
              <input
                type="hidden"
                name="businessId"
                value={filters.businessId}
              />
            ) : null}
          </FilterBar>

          <section className="mb-6">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className={`${FONT_BOLD} text-[14px] text-[#2D3748]`}>
                Usage by business
              </h2>
              <p className={TEXT_MUTED_SM}>
                Matches the endpoint, model and period filters. Click a business
                to filter the ledger below.
              </p>
            </div>
            <AiUsageBusinessTable
              rows={data.byBusiness}
              selected={filters.businessId}
            />
          </section>

          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className={`${FONT_BOLD} text-[14px] text-[#2D3748]`}>
              Call ledger
              {filters.businessId ? (
                <span className={`${FONT_REGULAR} text-gray-500`}>
                  {" "}
                  —{" "}
                  {filters.businessId === UNATTRIBUTED
                    ? "Unattributed"
                    : (selectedBusiness?.businessName ?? "Selected business")}
                </span>
              ) : null}
            </h2>
            {filters.businessId ? (
              <Link
                to={clearBusinessHref}
                preventScrollReset
                className={`${FONT_BOLD} text-[12px] text-teal-700 hover:underline`}
              >
                Show all businesses
              </Link>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Endpoint</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">Tokens (in/out)</th>
                  <th className="pb-2 font-medium">Cost</th>
                  <th className="pb-2 font-medium">Latency</th>
                  <th className="pb-2 font-medium">OK</th>
                  <th className="pb-2 font-medium">Business</th>
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.page.rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-xs">{r.endpoint}</td>
                    <td className="py-2">{r.stage}</td>
                    <td className="py-2 text-gray-600">{r.model}</td>
                    <td className="py-2">
                      {r.promptTokens} / {r.completionTokens}
                    </td>
                    <td className="py-2">
                      {r.costUsd !== null ? `$${r.costUsd.toFixed(6)}` : "—"}
                    </td>
                    <td className="py-2">{r.latencyMs}ms</td>
                    <td className="py-2">
                      {r.ok ? (
                        <span className="text-green-600">OK</span>
                      ) : (
                        <span
                          className="text-red-600"
                          title={r.errorKind ?? undefined}
                        >
                          FAIL
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-gray-600">
                      {r.businessName ?? (
                        <span className="italic text-gray-400">
                          Unattributed
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-gray-600">{r.userName ?? "—"}</td>
                    <td className="py-2 text-gray-600">{r.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={data.page} />
        </>
      )}
    </div>
  );
}
