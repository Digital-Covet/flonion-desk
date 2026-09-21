import { randomUUID } from "node:crypto";
import { useOutletContext } from "react-router";
import { ActionMenu } from "../components/shell/ActionMenu";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { type BadgeTone, StatusBadge } from "../components/shell/StatusBadge";
import { ReplyDialog } from "../components/support/ReplyDialog";
import { FilterSelect, SearchField } from "../components/ui/FilterSelect";
import { escapeHtml, sendEmail } from "../lib/email.server";
import { clientIp, recordAudit } from "../prisma/audit";
import { db } from "../prisma/db";
import { readFailure } from "../prisma/loader-error";
import { readBody, readText } from "../prisma/moderation";
import {
  type Operator,
  requireOperator,
  requireOperatorRead,
} from "../prisma/operator";
import { readIntParam, readPageParams, readWindowDays } from "../prisma/paging";
import { loadSupportList, SUPPORT_SORT_KEYS } from "../prisma/support";
import { formatDate, toStamp } from "../prisma/time";
import type { Route } from "./+types/support";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Support Inbox" },
    { name: "description", content: "Customer feedback and support requests." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireOperatorRead(request);
  const url = new URL(request.url);
  const params = readPageParams(url, SUPPORT_SORT_KEYS);

  const categories =
    url.searchParams.get("categories")?.split(",").filter(Boolean) ?? [];
  const statuses =
    url.searchParams.get("statuses")?.split(",").filter(Boolean) ?? [];

  const filters = {
    q: url.searchParams.get("q"),
    categories,
    statuses,
    // Feedback is rated out of five.
    rating: readIntParam(url.searchParams, "rating", 1, 5),
    createdWithinDays: readWindowDays(url.searchParams),
  };

  try {
    return {
      data: await loadSupportList(filters, params),
      filters,
      params,
      error: null,
    };
  } catch (cause) {
    return {
      data: null,
      filters,
      params,
      error: readFailure("support", cause),
    };
  }
}

/** Longest reply the inbox accepts; the dialog enforces the same limit. */
const REPLY_MAX = 5000;

/**
 * The reply email: the operator's text, then the customer's own message
 * quoted under it so the thread reads on its own in any mail client.
 */
function replyEmail(
  fb: {
    name: string;
    email: string;
    category: string;
    message: string;
    createdAt: string;
  },
  body: string,
) {
  const wrote = `On ${formatDate(fb.createdAt)}, you wrote:`;
  const quoted = fb.message
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
  const paragraphs = (text: string) =>
    escapeHtml(text).split(/\r?\n/).join("<br>");

  return {
    to: fb.email,
    toName: fb.name,
    subject: `Re: your Flonion feedback (${fb.category})`,
    replyTo: process.env.SUPPORT_REPLY_TO || null,
    text: `${body}\n\n— Flonion Support\n\n${wrote}\n${quoted}\n`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1c1917">
<p>${paragraphs(body)}</p>
<p>— Flonion Support</p>
<p style="color:#57534e;margin-top:24px">${escapeHtml(wrote)}</p>
<blockquote style="margin:0;padding-left:12px;border-left:3px solid #d6d3d1;color:#57534e">${paragraphs(fb.message)}</blockquote>
</div>`,
  };
}

/** Send, and turn a failure into the message stored on the reply row. */
async function deliver(
  mail: Parameters<typeof sendEmail>[0],
): Promise<string | null> {
  try {
    await sendEmail(mail);
    return null;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error("[Desk] support reply failed", message);
    return message.slice(0, 1000);
  }
}

function operatorName(operator: Operator): string {
  return operator.label.slice(0, 200);
}

export async function action({ request }: Route.ActionArgs) {
  const operator = await requireOperator(request);
  const body = await readBody(request);
  const intent = String(body.intent ?? "");
  const feedbackId = typeof body.feedbackId === "string" ? body.feedbackId : "";
  const ip = clientIp(request);

  const fb = await db.orm.public.Feedback.where((x) => x.id.eq(feedbackId))
    .select(
      "id",
      "status",
      "assignedTo",
      "name",
      "email",
      "category",
      "message",
      "createdAt",
    )
    .first();
  if (!fb) {
    return Response.json({ error: "Feedback not found" }, { status: 404 });
  }

  // Feedback has no `updatedAt` column; `resolvedAt` is its only write stamp.
  const now = toStamp(Date.now());

  switch (intent) {
    case "reply": {
      const text = typeof body.body === "string" ? body.body.trim() : "";
      if (!text) {
        return Response.json({ error: "The reply is empty" }, { status: 400 });
      }
      if (text.length > REPLY_MAX) {
        return Response.json(
          { error: `Replies are limited to ${REPLY_MAX} characters` },
          { status: 400 },
        );
      }
      const resolve = body.resolve === true || body.resolve === "on";

      // Sent before the write, so the row records what actually happened. A
      // failed send is still kept, marked failed, so the text is not lost and
      // can be retried from the thread.
      const failure = await deliver(replyEmail(fb, text));
      const sent = failure === null;
      const nextStatus = !sent
        ? fb.status
        : resolve
          ? "resolved"
          : fb.status === "new"
            ? "open"
            : fb.status;
      const replyId = randomUUID();

      await db.transaction(async (tx) => {
        await tx.orm.public.FeedbackReply.create({
          id: replyId,
          feedbackId,
          operatorId: operator.id,
          operatorLabel: operatorName(operator),
          body: text,
          deliveryStatus: sent ? "sent" : "failed",
          error: failure,
          sentAt: sent ? now : null,
        });
        if (nextStatus !== fb.status) {
          await tx.orm.public.Feedback.where((x) => x.id.eq(feedbackId)).update(
            nextStatus === "resolved"
              ? { status: nextStatus, resolvedAt: now }
              : { status: nextStatus },
          );
        }
        await recordAudit(tx, operator, {
          action: sent ? "feedback.reply" : "feedback.reply_failed",
          entity: "feedback",
          entityId: feedbackId,
          before: { status: fb.status },
          after: { status: nextStatus, replyId, delivered: sent },
          note: failure,
          ip,
        });
      });

      if (!sent) {
        return Response.json(
          { error: `Saved but not delivered: ${failure}`, replyId },
          { status: 502 },
        );
      }
      return { ok: true, replyId };
    }

    case "resend-reply": {
      const replyId = typeof body.replyId === "string" ? body.replyId : "";
      const reply = await db.orm.public.FeedbackReply.where((x) =>
        x.id.eq(replyId),
      )
        .select("id", "feedbackId", "body", "deliveryStatus")
        .first();
      if (!reply || reply.feedbackId !== feedbackId) {
        return Response.json({ error: "Reply not found" }, { status: 404 });
      }
      if (reply.deliveryStatus === "sent") {
        return Response.json(
          { error: "This reply was already delivered" },
          { status: 409 },
        );
      }

      const failure = await deliver(replyEmail(fb, reply.body));
      const sent = failure === null;
      await db.transaction(async (tx) => {
        await tx.orm.public.FeedbackReply.where((x) => x.id.eq(replyId)).update(
          sent
            ? { deliveryStatus: "sent", error: null, sentAt: now }
            : { error: failure },
        );
        if (sent && fb.status === "new") {
          await tx.orm.public.Feedback.where((x) => x.id.eq(feedbackId)).update(
            { status: "open" },
          );
        }
        await recordAudit(tx, operator, {
          action: sent ? "feedback.reply_resent" : "feedback.reply_failed",
          entity: "feedback",
          entityId: feedbackId,
          after: { replyId, delivered: sent },
          note: failure,
          ip,
        });
      });

      if (!sent) {
        return Response.json(
          { error: `Still not delivered: ${failure}` },
          { status: 502 },
        );
      }
      return { ok: true };
    }

    case "set-status": {
      const status = String(body.status ?? "");
      const validStatuses = ["new", "open", "resolved", "spam"];
      if (!validStatuses.includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      await db.transaction(async (tx) => {
        await tx.orm.public.Feedback.where((x) => x.id.eq(feedbackId)).update(
          status === "resolved" ? { status, resolvedAt: now } : { status },
        );
        await recordAudit(tx, operator, {
          action: "feedback.set_status",
          entity: "feedback",
          entityId: feedbackId,
          before: { status: fb.status },
          after: { status },
          ip,
        });
      });
      return { ok: true };
    }

    case "assign": {
      const assignedTo = readText(body.assignedTo, 200);
      await db.transaction(async (tx) => {
        await tx.orm.public.Feedback.where((x) => x.id.eq(feedbackId)).update({
          assignedTo,
          status: fb.status === "new" ? "open" : fb.status,
        });
        await recordAudit(tx, operator, {
          action: "feedback.assign",
          entity: "feedback",
          entityId: feedbackId,
          before: { assignedTo: fb.assignedTo },
          after: { assignedTo },
          ip,
        });
      });
      return { ok: true };
    }

    case "add-note": {
      const note = readText(body.operatorNote, 2000);
      await db.transaction(async (tx) => {
        await tx.orm.public.Feedback.where((x) => x.id.eq(feedbackId)).update({
          operatorNote: note,
        });
        await recordAudit(tx, operator, {
          action: "feedback.add_note",
          entity: "feedback",
          entityId: feedbackId,
          ip,
        });
      });
      return { ok: true };
    }

    case "delete-feedback": {
      await db.transaction(async (tx) => {
        await tx.orm.public.Feedback.where((x) => x.id.eq(feedbackId)).delete();
        await recordAudit(tx, operator, {
          action: "feedback.delete",
          entity: "feedback",
          entityId: feedbackId,
          ip,
        });
      });
      return { ok: true };
    }

    default:
      return Response.json(
        { error: `Unknown intent: ${intent}` },
        { status: 400 },
      );
  }
}

const STATUS_TONE: Record<string, BadgeTone> = {
  new: "info",
  open: "warn",
  resolved: "good",
  spam: "neutral",
};

export default function Support({ loaderData }: Route.ComponentProps) {
  const { data, filters, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="Support Inbox" operator={operator} />

      {data === null ? (
        <SectionError
          title="Support unavailable"
          detail="The platform database could not be read."
          error={error}
        />
      ) : (
        <>
          <StatRow
            items={[
              { id: "total", label: "Total", value: data.stats.total },
              { id: "new", label: "New", value: data.stats.newCount },
              { id: "open", label: "Open", value: data.stats.openCount },
              {
                id: "resolved",
                label: "Resolved",
                value: data.stats.resolvedCount,
              },
            ]}
          />

          <FilterBar active={Boolean(filters.q || filters.statuses.length)}>
            <SearchField
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search message, name, or email..."
              label="Support"
            />
            <FilterSelect
              name="statuses"
              label="Status"
              defaultValue={filters.statuses[0] ?? ""}
              placeholder="All statuses"
              options={[
                { value: "new", label: "New" },
                { value: "open", label: "Open" },
                { value: "resolved", label: "Resolved" },
                { value: "spam", label: "Spam" },
              ]}
            />
          </FilterBar>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">From</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Rating</th>
                  <th className="pb-2 font-medium">Message</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Assigned</th>
                  <th className="pb-2 font-medium">Replies</th>
                  <th className="pb-2 font-medium">Created</th>
                  <th className="pb-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.page.rows.map((fb) => (
                  <tr key={fb.id} className="border-b border-gray-100">
                    <td className="py-2">
                      <div className="font-medium">{fb.name}</div>
                      <div className="text-xs text-gray-500">{fb.email}</div>
                    </td>
                    <td className="py-2">{fb.category}</td>
                    <td className="py-2">{fb.rating}/5</td>
                    <td className="py-2 text-gray-600 max-w-[250px] truncate">
                      {fb.message}
                    </td>
                    <td className="py-2">
                      <StatusBadge tone={STATUS_TONE[fb.status] ?? "neutral"}>
                        {fb.status}
                      </StatusBadge>
                    </td>
                    <td className="py-2 text-gray-600">
                      {fb.assignedTo ?? "—"}
                    </td>
                    <td className="py-2 text-gray-600">{fb.replyCount}</td>
                    <td className="py-2 text-gray-600">{fb.created}</td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <ReplyDialog
                          feedbackId={fb.id}
                          name={fb.name}
                          email={fb.email}
                        />
                        <ActionMenu
                          label={`Actions for feedback from ${fb.name}`}
                          items={[
                            {
                              label: "Mark open",
                              intent: "set-status",
                              payload: { feedbackId: fb.id, status: "open" },
                              hidden: fb.status === "open",
                            },
                            {
                              label: "Mark resolved",
                              intent: "set-status",
                              payload: {
                                feedbackId: fb.id,
                                status: "resolved",
                              },
                              hidden: fb.status === "resolved",
                            },
                            {
                              label: "Mark as spam",
                              intent: "set-status",
                              payload: { feedbackId: fb.id, status: "spam" },
                              hidden: fb.status === "spam",
                            },
                            {
                              label: "Assign…",
                              intent: "assign",
                              payload: { feedbackId: fb.id },
                              dialog: {
                                title: "Assign this thread",
                                description:
                                  "Name who is handling it. Leave it blank to unassign. A new thread moves to open.",
                                confirmLabel: "Save",
                                text: {
                                  label: "Assignee",
                                  name: "assignedTo",
                                  maxLength: 200,
                                },
                              },
                            },
                            {
                              label: fb.operatorNote
                                ? "Edit note…"
                                : "Add note…",
                              intent: "add-note",
                              payload: { feedbackId: fb.id },
                              dialog: {
                                title: "Internal note",
                                description: fb.operatorNote
                                  ? `Current note: ${fb.operatorNote}. Saving replaces it; save it blank to clear it.`
                                  : "Only operators see this. It is never sent to the customer.",
                                confirmLabel: "Save note",
                                text: {
                                  label: "Note",
                                  name: "operatorNote",
                                  maxLength: 2000,
                                },
                              },
                            },
                            {
                              label: "Delete…",
                              intent: "delete-feedback",
                              payload: { feedbackId: fb.id },
                              destructive: true,
                              dialog: {
                                title: "Delete this feedback?",
                                description:
                                  "The feedback and every reply stored with it are deleted. An archived copy is kept for a year.",
                                confirmLabel: "Delete",
                                confirmValue: fb.email,
                              },
                            },
                          ]}
                        />
                      </div>
                    </td>
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
