import type { SortDir } from "../../prisma/paging";
import type { ReviewListRow } from "../../prisma/reviews";
import { FONT_BOLD, FONT_REGULAR, TEXT_MUTED_SM } from "../constants";
import { ActionMenu } from "../shell/ActionMenu";
import { type Column, DataTable } from "../shell/DataTable";
import { StatusBadge } from "../shell/StatusBadge";
import { Hint } from "../ui/Hint";
import { banUserItem } from "../users/userActions";

const STATUS_TONE = {
  visible: "good",
  hidden: "neutral",
  flagged: "warn",
} as const;

/** What the delete dialog asks the operator to type. */
export function reviewConfirmValue(id: string): string {
  return id.slice(0, 8);
}

/**
 * The Reviews table, styled to match Businesses: CARD frame, sortable
 * headings, badge status, tooltip text preview.
 */
export function ReviewTable({
  rows,
  sort,
  dir,
}: {
  rows: ReviewListRow[];
  sort: string;
  dir: SortDir;
}) {
  const columns: Column<ReviewListRow>[] = [
    {
      id: "rating",
      label: "Rating",
      sortKey: "rating",
      numeric: true,
      render: (r) => (
        <span className={`${FONT_BOLD} text-[13px] text-[#2D3748]`}>
          {r.rating}
          <span className={TEXT_MUTED_SM}>/5</span>
        </span>
      ),
    },
    {
      id: "text",
      label: "Review",
      render: (r) =>
        r.text ? (
          <Hint
            label={r.text}
            render={<span className="block max-w-[260px] truncate" />}
          >
            <span
              className={`${FONT_REGULAR} text-[13px] text-[#2D3748] block truncate`}
            >
              {r.text}
            </span>
          </Hint>
        ) : (
          <span className={TEXT_MUTED_SM}>—</span>
        ),
    },
    {
      id: "reviewer",
      label: "Reviewer",
      render: (r) => (
        <div className="min-w-0">
          <p className={`${FONT_REGULAR} text-[13px] text-[#2D3748] truncate`}>
            {r.reviewerName ?? "Anonymous"}
          </p>
          <p className={`${TEXT_MUTED_SM} truncate`}>{r.authorName}</p>
        </div>
      ),
    },
    {
      id: "business",
      label: "Business",
      render: (r) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {r.businessName ?? "Unattached"}
        </span>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (r) => (
        <StatusBadge
          tone={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? "warn"}
        >
          {r.status}
        </StatusBadge>
      ),
    },
    {
      id: "ai",
      label: "AI copies",
      numeric: true,
      render: (r) => (
        <span className={`${FONT_REGULAR} text-[13px] text-[#2D3748]`}>
          {r.analyticsAiCopyCount}
        </span>
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
          label={`Actions for review ${reviewConfirmValue(r.id)}`}
          items={[
            {
              label: "Hide…",
              intent: "hide-review",
              payload: { reviewId: r.id },
              hidden: r.status === "hidden",
              dialog: {
                title: "Hide this review?",
                description:
                  "Its public link and QR code stop working and it stops being counted. The author can still see it.",
                confirmLabel: "Hide review",
                text: { label: "Reason" },
              },
            },
            {
              label: "Flag…",
              intent: "flag-review",
              payload: { reviewId: r.id },
              hidden: r.status === "flagged",
              dialog: {
                title: "Flag this review?",
                description:
                  "Flagged reviews come off public pages like hidden ones, and are marked for follow-up.",
                confirmLabel: "Flag review",
                text: { label: "What needs checking" },
              },
            },
            {
              label: "Restore",
              intent: "unhide-review",
              payload: { reviewId: r.id },
              hidden: r.status === "visible",
            },
            {
              label: "Redact text…",
              intent: "redact-text",
              payload: { reviewId: r.id },
              hidden: r.text === "[redacted by operator]",
              dialog: {
                title: "Redact the text of this review?",
                description:
                  "The text is replaced with a redaction notice. The original is kept in the audit log only.",
                confirmLabel: "Redact",
                text: { label: "Reason" },
              },
            },
            {
              ...banUserItem(
                r.authorId,
                r.authorName,
                "Ban author…",
                r.authorBanned,
              ),
              hidden: !r.authorId || r.authorBanned,
            },
            {
              label: "Delete…",
              intent: "delete-review",
              payload: { reviewId: r.id },
              destructive: true,
              dialog: {
                title: "Delete this review?",
                description:
                  "The review and its analytics are deleted and printed QR codes that point at it stop working. An archived copy is kept for a year.",
                confirmLabel: "Delete review",
                confirmValue: reviewConfirmValue(r.id),
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
      empty="No reviews match these filters."
    />
  );
}
