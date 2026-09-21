import type { MeetingRequestRow, TeamMeetingRow } from "../../prisma/meetings";
import type { SortDir } from "../../prisma/paging";
import { FONT_BOLD, FONT_REGULAR, TEXT_MUTED_SM } from "../constants";
import { ActionMenu } from "../shell/ActionMenu";
import { type Column, DataTable } from "../shell/DataTable";
import { type BadgeTone, StatusBadge } from "../shell/StatusBadge";
import { Hint } from "../ui/Hint";
import { banUserItem } from "../users/userActions";

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: "info",
  accepted: "good",
  rejected: "neutral",
  cancelled: "neutral",
};

/**
 * Meeting-requests table, styled to match Businesses: CARD frame, badge
 * status/type, sortable Created heading.
 *
 * Action items are identical to the previous inline table; only the chrome
 * changed.
 */
export function MeetingRequestTable({
  rows,
  sort,
  dir,
}: {
  rows: MeetingRequestRow[];
  sort: string;
  dir: SortDir;
}) {
  const columns: Column<MeetingRequestRow>[] = [
    {
      id: "date",
      label: "Date",
      render: (r) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {r.slotDate}
        </span>
      ),
    },
    {
      id: "time",
      label: "Time",
      render: (r) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {r.slotTime}
        </span>
      ),
    },
    {
      id: "business",
      label: "Business",
      render: (r) => (
        <span className={`${FONT_BOLD} text-[13px] text-[#2D3748]`}>
          {r.businessName}
        </span>
      ),
    },
    {
      id: "requester",
      label: "Requester",
      render: (r) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {r.requesterName}
        </span>
      ),
    },
    {
      id: "type",
      label: "Type",
      render: (r) => (
        <StatusBadge tone={r.isGuest ? "info" : "neutral"}>
          {r.isGuest ? "Guest" : "Member"}
        </StatusBadge>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (r) => (
        <StatusBadge tone={STATUS_TONE[r.status] ?? "warn"}>
          {r.status}
        </StatusBadge>
      ),
    },
    {
      id: "meet",
      label: "Meet",
      render: (r) =>
        r.hasMeetLink ? (
          <StatusBadge tone="good">Linked</StatusBadge>
        ) : (
          <span className={TEXT_MUTED_SM}>—</span>
        ),
    },
    {
      id: "created",
      label: "Created",
      sortKey: "createdAt",
      render: (r) => <span className={TEXT_MUTED_SM}>{r.created}</span>,
    },
    {
      id: "actions",
      label: "",
      render: (r) => (
        <ActionMenu
          label={`Actions for the request from ${r.requesterName}`}
          items={[
            {
              label: "Reject…",
              intent: "set-meeting-status",
              payload: { meetingId: r.id, status: "rejected" },
              hidden: r.status !== "pending",
              dialog: {
                title: "Reject this meeting request?",
                description:
                  "The request is marked rejected and its slot is freed. No email is sent to the requester.",
                confirmLabel: "Reject request",
                text: { label: "Reason" },
              },
            },
            {
              label: "Cancel…",
              intent: "set-meeting-status",
              payload: { meetingId: r.id, status: "cancelled" },
              hidden: r.status === "cancelled" || r.status === "rejected",
              dialog: {
                title: "Cancel this meeting?",
                description:
                  "The meeting is marked cancelled and its slot is freed. No email is sent to either side.",
                confirmLabel: "Cancel meeting",
                text: { label: "Reason" },
              },
            },
            {
              label: "Clear Meet link",
              intent: "clear-meet-link",
              payload: { meetingId: r.id },
              hidden: !r.hasMeetLink,
            },
            {
              ...banUserItem(
                r.requesterId ?? "",
                r.requesterName,
                "Ban requester…",
                r.requesterBanned,
              ),
              hidden: !r.requesterId || r.requesterBanned,
            },
            {
              label: "Delete…",
              intent: "delete-meeting",
              payload: { meetingId: r.id },
              destructive: true,
              dialog: {
                title: "Delete this meeting request?",
                description:
                  "The request is permanently deleted and its slot is freed.",
                confirmLabel: "Delete request",
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      sort={sort}
      dir={dir}
      empty="No meeting requests match these filters."
    />
  );
}

/** Team-meetings table: same chrome, no sortable columns. */
export function TeamMeetingTable({ rows }: { rows: TeamMeetingRow[] }) {
  const columns: Column<TeamMeetingRow>[] = [
    {
      id: "title",
      label: "Title",
      render: (tm) => (
        <span className={`${FONT_BOLD} text-[13px] text-[#2D3748]`}>
          {tm.title}
        </span>
      ),
    },
    {
      id: "business",
      label: "Business",
      render: (tm) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {tm.businessName}
        </span>
      ),
    },
    {
      id: "date",
      label: "Date",
      render: (tm) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {tm.date}
        </span>
      ),
    },
    {
      id: "time",
      label: "Time",
      render: (tm) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {tm.startTime} — {tm.endTime}
        </span>
      ),
    },
    {
      id: "location",
      label: "Location",
      render: (tm) =>
        tm.location ? (
          <Hint
            label={tm.location}
            render={<span className="block max-w-[220px] truncate" />}
          >
            <span className={`${TEXT_MUTED_SM} block truncate`}>
              {tm.location}
            </span>
          </Hint>
        ) : (
          <span className={TEXT_MUTED_SM}>—</span>
        ),
    },
    {
      id: "meet",
      label: "Meet",
      render: (tm) =>
        tm.hasMeetLink ? (
          <StatusBadge tone="good">Linked</StatusBadge>
        ) : (
          <span className={TEXT_MUTED_SM}>—</span>
        ),
    },
    {
      id: "actions",
      label: "",
      render: (tm) => (
        <ActionMenu
          label={`Actions for ${tm.title}`}
          items={[
            {
              label: "Delete…",
              intent: "delete-team-meeting",
              payload: { meetingId: tm.id },
              destructive: true,
              dialog: {
                title: `Delete "${tm.title}"?`,
                description:
                  "The team meeting is permanently deleted from the business's calendar.",
                confirmLabel: "Delete meeting",
                confirmValue: tm.title,
                text: { label: "Reason" },
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(tm) => tm.id}
      empty="No team meetings found."
    />
  );
}
