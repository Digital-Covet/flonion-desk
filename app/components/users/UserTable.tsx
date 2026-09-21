import { Link } from "react-router";
import type { SortDir } from "../../prisma/paging";
import type { UserListRow } from "../../prisma/users";
import { COLORS, FONT_BOLD, FONT_REGULAR, TEXT_MUTED_SM } from "../constants";
import { ActionMenu } from "../shell/ActionMenu";
import { type Column, DataTable } from "../shell/DataTable";
import { StatusBadge } from "../shell/StatusBadge";
import { userActionItems } from "./userActions";

/**
 * The Users table, styled to match Businesses: avatar + two-line identity,
 * badge standing instead of Yes/No text, sortable headings, CARD frame.
 */
export function UserTable({
  rows,
  sort,
  dir,
}: {
  rows: UserListRow[];
  sort: string;
  dir: SortDir;
}) {
  const columns: Column<UserListRow>[] = [
    {
      id: "name",
      label: "User",
      sortKey: "name",
      render: (u) => (
        <div className="flex items-center gap-3 min-w-0">
          {u.avatar ? (
            <img
              src={u.avatar}
              alt=""
              className="size-[28px] rounded-[8px] object-cover flex-none"
            />
          ) : (
            <div
              className="size-[28px] rounded-[8px] flex items-center justify-center flex-none"
              style={{ backgroundColor: COLORS.border }}
            >
              <span className={`${FONT_BOLD} text-[11px] text-[#2D3748]`}>
                {u.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <Link
              to={`/users/${u.id}`}
              className={`${FONT_BOLD} text-[13px] text-[#2D3748] hover:underline block truncate`}
            >
              {u.name}
            </Link>
            <p className={`${TEXT_MUTED_SM} truncate`}>{u.standing}</p>
          </div>
        </div>
      ),
    },
    {
      id: "email",
      label: "Email",
      sortKey: "email",
      render: (u) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {u.email}
        </span>
      ),
    },
    {
      id: "role",
      label: "Role",
      render: (u) => (
        <span
          className={`${FONT_REGULAR} text-[13px] text-[#2D3748] capitalize`}
        >
          {u.role}
        </span>
      ),
    },
    {
      id: "verified",
      label: "Verified",
      render: (u) =>
        u.emailVerified ? (
          <StatusBadge tone="good">Verified</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Unverified</StatusBadge>
        ),
    },
    {
      id: "2fa",
      label: "2FA",
      render: (u) =>
        u.twoFactorEnabled ? (
          <StatusBadge tone="info">On</StatusBadge>
        ) : (
          <span className={TEXT_MUTED_SM}>Off</span>
        ),
    },
    {
      id: "banned",
      label: "Standing",
      render: (u) =>
        u.banned ? (
          <StatusBadge tone="bad" title={u.banReason ?? undefined}>
            {u.banExpires ? `Until ${u.banExpires}` : "Banned"}
          </StatusBadge>
        ) : (
          <StatusBadge tone="good">Active</StatusBadge>
        ),
    },
    {
      id: "created",
      label: "Created",
      sortKey: "createdAt",
      render: (u) => <span className={TEXT_MUTED_SM}>{u.created}</span>,
    },
    {
      id: "actions",
      label: "",
      render: (u) => (
        <ActionMenu
          label={`Actions for ${u.name}`}
          items={userActionItems(u)}
        />
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(u) => u.id}
      sort={sort}
      dir={dir}
      empty="No users match these filters."
    />
  );
}
