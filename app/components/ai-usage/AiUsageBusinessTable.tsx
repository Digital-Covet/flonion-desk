import { Link, useSearchParams } from "react-router";
import type { AiUsageBusinessRow } from "../../prisma/ai-usage";
import { FONT_BOLD, FONT_REGULAR, TEXT_MUTED_SM } from "../constants";
import { UNATTRIBUTED } from "../data/aiUsage";
import { type Column, DataTable } from "../shell/DataTable";

const CELL = `${FONT_REGULAR} text-[13px] text-[#2D3748]`;

export function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  // Single calls cost fractions of a cent, so small totals keep precision.
  return value < 1 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

/**
 * Per-business AI spend for the calls matching the page's filters. Each name
 * links to the ledger filtered to that business, keeping the other filters.
 */
export function AiUsageBusinessTable({
  rows,
  selected,
}: {
  rows: AiUsageBusinessRow[];
  selected: string | null;
}) {
  const [params] = useSearchParams();

  const hrefFor = (businessId: string | null) => {
    const next = new URLSearchParams(params);
    next.set("businessId", businessId ?? UNATTRIBUTED);
    next.delete("page");
    return `?${next.toString()}`;
  };

  const columns: Column<AiUsageBusinessRow>[] = [
    {
      id: "business",
      label: "Business",
      render: (r) => {
        const key = r.businessId ?? UNATTRIBUTED;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to={hrefFor(r.businessId)}
              preventScrollReset
              className={`${key === selected ? FONT_BOLD : FONT_REGULAR} text-[13px] ${
                r.businessId ? "text-teal-700" : "text-gray-500 italic"
              } hover:underline truncate`}
            >
              {r.businessName ?? "Unattributed"}
            </Link>
            {r.businessId ? (
              <Link
                to={`/businesses/${r.businessId}`}
                className={`${TEXT_MUTED_SM} hover:underline shrink-0`}
              >
                profile
              </Link>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "calls",
      label: "Calls",
      numeric: true,
      render: (r) => (
        <span className={CELL}>
          {r.calls.toLocaleString()}
          {r.failed > 0 ? (
            <span className="text-red-600 text-[12px]">
              {" "}
              ({r.failed} failed)
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "in",
      label: "Tokens in",
      numeric: true,
      render: (r) => (
        <span className={CELL}>{r.promptTokens.toLocaleString()}</span>
      ),
    },
    {
      id: "out",
      label: "Tokens out",
      numeric: true,
      render: (r) => (
        <span className={CELL}>{r.completionTokens.toLocaleString()}</span>
      ),
    },
    {
      id: "total",
      label: "Total tokens",
      numeric: true,
      render: (r) => (
        <span className={`${FONT_BOLD} text-[13px] text-[#2D3748]`}>
          {(r.promptTokens + r.completionTokens).toLocaleString()}
        </span>
      ),
    },
    {
      id: "cost",
      label: "Cost",
      numeric: true,
      render: (r) => (
        <span className={`${FONT_BOLD} text-[13px] text-[#2D3748]`}>
          {formatUsd(r.costUsd)}
        </span>
      ),
    },
    {
      id: "share",
      label: "Share of cost",
      numeric: true,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-20 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-teal-500"
              style={{ width: `${Math.min(100, r.costShare)}%` }}
            />
          </div>
          <span className={`${CELL} w-12`}>{r.costShare.toFixed(1)}%</span>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.businessId ?? UNATTRIBUTED}
      empty="No AI calls match these filters."
    />
  );
}
