import { Link } from "react-router";
import type { SortDir } from "../../prisma/paging";
import { COLORS, FONT_BOLD, FONT_REGULAR, TEXT_MUTED_SM } from "../constants";
import { ActionMenu } from "../shell/ActionMenu";
import { type Column, DataTable } from "../shell/DataTable";
import { StatusBadge } from "../shell/StatusBadge";
import type { BusinessListRow } from "../types";
import { Hint } from "../ui/Hint";
import { businessActionItems } from "./businessActions";

/**
 * The Businesses table.
 *
 * Two columns need a caveat rather than a number on its own:
 *
 * - **Google rating** is a cache written from the Business Profile API with no
 *   freshness stamp, and it is unrelated to the reviews collected through
 *   Flonion. A business can show 4.8 here with no shared reviews at all, so it
 *   is labelled as Google's figure and never mixed with the platform's own.
 * - **Reviews** is absent on purpose. Until reviews carry a business id, the
 *   count costs a second query per row through the author's owned business or
 *   team, which is not worth a table column. It lives on the detail page.
 */
export function BusinessTable({
  rows,
  sort,
  dir,
}: {
  rows: BusinessListRow[];
  sort: string;
  dir: SortDir;
}) {
  const columns: Column<BusinessListRow>[] = [
    {
      id: "name",
      label: "Business",
      sortKey: "name",
      render: (b) => (
        <div className="flex items-center gap-3 min-w-0">
          {b.logo ? (
            <img
              src={b.logo}
              alt=""
              referrerPolicy="no-referrer"
              className="size-[28px] rounded-[8px] object-cover flex-none"
            />
          ) : (
            <div
              className="size-[28px] rounded-[8px] flex items-center justify-center flex-none"
              style={{ backgroundColor: COLORS.border }}
            >
              <span className={`${FONT_BOLD} text-[11px] text-[#2D3748]`}>
                {b.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <Link
              to={`/businesses/${b.id}`}
              className={`${FONT_BOLD} text-[13px] text-[#2D3748] hover:underline block truncate`}
            >
              {b.name}
            </Link>
            <p className={`${TEXT_MUTED_SM} truncate`}>
              {b.username ? `@${b.username}` : "No public profile"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "owner",
      label: "Owner",
      render: (b) => (
        <div className="min-w-0">
          <p className={`${FONT_REGULAR} text-[13px] text-[#2D3748] truncate`}>
            {b.ownerName}
          </p>
          <p className={`${TEXT_MUTED_SM} truncate`}>{b.ownerEmail}</p>
        </div>
      ),
    },
    {
      id: "sector",
      label: "Sector",
      render: (b) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {b.sector ?? "—"}
        </span>
      ),
    },
    {
      id: "category",
      label: "Category",
      render: (b) =>
        b.category ? (
          <Hint label="Derived from sector and keywords, the same way the marketplace does it">
            <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
              {b.category}
            </span>
          </Hint>
        ) : (
          <Hint label="No keyword match. The marketplace falls back to Professional Services for these.">
            <span className={TEXT_MUTED_SM}>Uncategorised</span>
          </Hint>
        ),
    },
    {
      id: "rating",
      label: "Google rating",
      sortKey: "rating",
      numeric: true,
      render: (b) =>
        b.rating === null ? (
          <span className={TEXT_MUTED_SM}>—</span>
        ) : (
          <Hint label="Cached from Google Business Profile. There is no refresh timestamp, so its age is unknown.">
            <span className={`${FONT_BOLD} text-[13px] text-[#2D3748]`}>
              {b.rating.toFixed(1)}
              <span className={TEXT_MUTED_SM}> ({b.reviewCount ?? 0})</span>
            </span>
          </Hint>
        ),
    },
    {
      id: "qr",
      label: "QR scans",
      sortKey: "qrScanCount",
      numeric: true,
      render: (b) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {b.qrScanCount.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      id: "team",
      label: "Team",
      numeric: true,
      render: (b) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {b.teamSize}
        </span>
      ),
    },
    {
      id: "onboarding",
      label: "Onboarding",
      render: (b) => (
        <span
          className={`${FONT_BOLD} text-[11px] px-2 py-1 rounded-[8px]`}
          style={{
            backgroundColor: b.ownerOnboarded ? "#E6FFFA" : "#FFF5F5",
            color: b.ownerOnboarded ? COLORS.tealDark : COLORS.red,
          }}
        >
          {b.ownerOnboarded ? "Complete" : "Incomplete"}
        </span>
      ),
    },
    {
      id: "moderation",
      label: "Status",
      render: (b) => (
        <div className="flex flex-wrap gap-1">
          {b.status === "suspended" ? (
            <StatusBadge tone="bad" title={b.suspendReason ?? undefined}>
              Suspended
            </StatusBadge>
          ) : (
            <StatusBadge tone="good">Active</StatusBadge>
          )}
          {b.marketplaceHidden ? (
            <StatusBadge tone="neutral">Unlisted</StatusBadge>
          ) : null}
          {b.ownerBanned ? (
            <StatusBadge tone="warn">Owner banned</StatusBadge>
          ) : null}
        </div>
      ),
    },
    {
      id: "created",
      label: "Created",
      sortKey: "createdAt",
      render: (b) => <span className={TEXT_MUTED_SM}>{b.created}</span>,
    },
    {
      id: "actions",
      label: "",
      render: (b) => (
        <ActionMenu
          label={`Actions for ${b.name}`}
          items={businessActionItems(b)}
        />
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(b) => b.id}
      sort={sort}
      dir={dir}
      empty="No businesses match these filters."
    />
  );
}
