import { Link } from "react-router";
import type {
  FavouriteRow,
  ListingModeration,
  ModeratedListingRow,
  NewArrivalRow,
} from "../../prisma/marketplace";
import { businessActionItems } from "../businesses/businessActions";
import { COLORS, FONT_BOLD, FONT_REGULAR, TEXT_MUTED_SM } from "../constants";
import { ActionMenu } from "../shell/ActionMenu";
import { type Column, DataTable } from "../shell/DataTable";
import { StatusBadge } from "../shell/StatusBadge";
import { Hint } from "../ui/Hint";

function ListingBadges({ b }: { b: ListingModeration }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {b.status === "suspended" ? (
        <StatusBadge tone="bad">Suspended</StatusBadge>
      ) : null}
      {b.marketplaceHidden ? (
        <StatusBadge tone="neutral">Unlisted</StatusBadge>
      ) : null}
    </span>
  );
}

function ListingActions({
  b,
}: {
  b: ListingModeration & { id: string; name: string };
}) {
  return (
    <ActionMenu
      label={`Actions for ${b.name}`}
      items={businessActionItems(b)}
    />
  );
}

function BusinessCell({
  id,
  name,
  username,
  logo,
  badges,
}: {
  id: string;
  name: string;
  username: string | null;
  logo?: string | null;
  badges?: ListingModeration;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {logo ? (
        <img
          src={logo}
          alt=""
          className="size-[28px] rounded-[8px] object-cover flex-none"
        />
      ) : (
        <div
          className="size-[28px] rounded-[8px] flex items-center justify-center flex-none"
          style={{ backgroundColor: COLORS.border }}
        >
          <span className={`${FONT_BOLD} text-[11px] text-[#2D3748]`}>
            {name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <Link
          to={`/businesses/${id}`}
          className={`${FONT_BOLD} text-[13px] text-[#2D3748] hover:underline block truncate`}
        >
          {name}
        </Link>
        <p className={`${TEXT_MUTED_SM} truncate`}>
          {username ? `@${username}` : "No public profile"}
        </p>
        {badges &&
        (badges.status === "suspended" || badges.marketplaceHidden) ? (
          <div className="mt-1">
            <ListingBadges b={badges} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Businesses an operator has taken out of partner search. */
export function ModeratedTable({ rows }: { rows: ModeratedListingRow[] }) {
  const columns: Column<ModeratedListingRow>[] = [
    {
      id: "business",
      label: "Business",
      render: (b) => (
        <BusinessCell id={b.id} name={b.name} username={b.username} />
      ),
    },
    {
      id: "state",
      label: "State",
      render: (b) => <ListingBadges b={b} />,
    },
    {
      id: "reason",
      label: "Reason",
      render: (b) =>
        b.suspendReason ? (
          <Hint
            label={b.suspendReason}
            render={<span className="block max-w-[260px] truncate" />}
          >
            <span
              className={`${FONT_REGULAR} text-[13px] text-[#2D3748] block truncate`}
            >
              {b.suspendReason}
            </span>
          </Hint>
        ) : (
          <span className={TEXT_MUTED_SM}>—</span>
        ),
    },
    {
      id: "changed",
      label: "Changed",
      render: (b) => <span className={TEXT_MUTED_SM}>{b.updated}</span>,
    },
    {
      id: "actions",
      label: "",
      render: (b) => <ListingActions b={b} />,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(b) => b.id}
      framed={false}
      empty="Every business is listed."
    />
  );
}

/** Most-favourited businesses. */
export function FavouritesTable({ rows }: { rows: FavouriteRow[] }) {
  const columns: Column<FavouriteRow>[] = [
    {
      id: "rank",
      label: "#",
      numeric: true,
      // Rank is positional in the already-sorted leaderboard.
      render: (f) => (
        <span className={TEXT_MUTED_SM}>
          {rows.findIndex((r) => r.id === f.id) + 1}
        </span>
      ),
    },
    {
      id: "business",
      label: "Business",
      render: (f) => (
        <BusinessCell
          id={f.id}
          name={f.name}
          username={null}
          logo={f.logo}
          badges={f}
        />
      ),
    },
    {
      id: "count",
      label: "Favourited by",
      numeric: true,
      render: (f) => (
        <span className={`${FONT_BOLD} text-[13px] text-[#2D3748]`}>
          {f.favouriteCount}
        </span>
      ),
    },
    {
      id: "actions",
      label: "",
      render: (f) => <ListingActions b={f} />,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(f) => f.id}
      framed={false}
      empty="No favourites yet."
    />
  );
}

/** Businesses created in the last 30 days. */
export function NewArrivalsTable({ rows }: { rows: NewArrivalRow[] }) {
  const columns: Column<NewArrivalRow>[] = [
    {
      id: "name",
      label: "Business",
      render: (b) => (
        <BusinessCell
          id={b.id}
          name={b.name}
          username={b.username}
          logo={b.logo}
          badges={b}
        />
      ),
    },
    {
      id: "category",
      label: "Category",
      render: (b) =>
        b.category ? (
          <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
            {b.category}
          </span>
        ) : (
          <span className={TEXT_MUTED_SM}>Uncategorised</span>
        ),
    },
    {
      id: "owner",
      label: "Owner",
      render: (b) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {b.ownerName}
        </span>
      ),
    },
    {
      id: "created",
      label: "Created",
      render: (b) => <span className={TEXT_MUTED_SM}>{b.created}</span>,
    },
    {
      id: "actions",
      label: "",
      render: (b) => <ListingActions b={b} />,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(b) => b.id}
      framed={false}
      empty="No new businesses."
    />
  );
}
