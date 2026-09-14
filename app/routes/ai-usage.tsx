import { useOutletContext } from "react-router";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { SearchField } from "../components/ui/FilterSelect";
import { AI_USAGE_SORT_KEYS, loadAiUsageList } from "../prisma/ai-usage";
import { readFailure } from "../prisma/loader-error";
import { requireOperatorRead } from "../prisma/operator";
import { readPageParams } from "../prisma/paging";
import type { Route } from "./+types/ai-usage";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — AI Usage" },
    { name: "description", content: "LLM usage ledger across all tenants." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireOperatorRead(request);
  const url = new URL(request.url);
  const params = readPageParams(url, AI_USAGE_SORT_KEYS);

  const filters = {
    endpoint: url.searchParams.get("endpoint"),
    stage: url.searchParams.get("stage"),
    model: url.searchParams.get("model"),
    ok: url.searchParams.get("ok") as "yes" | "no" | null,
    userId: url.searchParams.get("userId"),
    businessId: url.searchParams.get("businessId"),
    createdWithinDays: url.searchParams.get("createdWithinDays")
      ? Number.parseInt(url.searchParams.get("createdWithinDays") ?? "0", 10)
      : null,
  };

  try {
    return {
      data: await loadAiUsageList(filters, params),
      params,
      error: null,
    };
  } catch (cause) {
    return { data: null, params, error: readFailure("ai-usage", cause) };
  }
}

export default function AiUsage({ loaderData }: Route.ComponentProps) {
  const { data, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

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

          <FilterBar active={false}>
            <SearchField
              name="endpoint"
              defaultValue=""
              placeholder="Endpoint..."
              label="Endpoint"
            />
            <SearchField
              name="model"
              defaultValue=""
              placeholder="Model..."
              label="Model"
            />
          </FilterBar>

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
