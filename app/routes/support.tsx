import { useOutletContext } from "react-router";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { FilterSelect, SearchField } from "../components/ui/FilterSelect";
import { clientIp, recordAudit } from "../prisma/audit";
import { db } from "../prisma/db";
import { readFailure } from "../prisma/loader-error";
import { requireOperator, requireOperatorRead } from "../prisma/operator";
import { readPageParams } from "../prisma/paging";
import { loadSupportList, SUPPORT_SORT_KEYS } from "../prisma/support";
import { toStamp } from "../prisma/time";
import type { Route } from "./+types/support";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Support Inbox" },
    { name: "description", content: "Customer feedback and support requests." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireOperatorRead(request);
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
    rating: url.searchParams.get("rating")
      ? Number.parseInt(url.searchParams.get("rating") ?? "0", 10)
      : null,
    createdWithinDays: url.searchParams.get("createdWithinDays")
      ? Number.parseInt(url.searchParams.get("createdWithinDays") ?? "0", 10)
      : null,
  };

  try {
    return {
      data: await loadSupportList(filters, params),
      params,
      error: null,
    };
  } catch (cause) {
    return { data: null, params, error: readFailure("support", cause) };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const operator = requireOperator(request);
  const body = await request.json();
  const intent = body.intent as string;
  const feedbackId = body.feedbackId as string;
  const ip = clientIp(request);

  const fb = await db.orm.public.Feedback.where((x) => x.id.eq(feedbackId))
    .select("id", "status", "assignedTo")
    .first();
  if (!fb) {
    return Response.json({ error: "Feedback not found" }, { status: 404 });
  }

  // Feedback has no `updatedAt` column; `resolvedAt` is its only write stamp.
  const now = toStamp(Date.now());

  switch (intent) {
    case "set-status": {
      const status = body.status as string;
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
      const assignedTo =
        typeof body.assignedTo === "string"
          ? body.assignedTo.trim() || null
          : null;
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
      const note =
        typeof body.operatorNote === "string" ? body.operatorNote.trim() : "";
      await db.transaction(async (tx) => {
        await tx.orm.public.Feedback.where((x) => x.id.eq(feedbackId)).update({
          operatorNote: note || null,
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

export default function Support({ loaderData }: Route.ComponentProps) {
  const { data, error } = loaderData;
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

          <FilterBar active={false}>
            <SearchField
              name="q"
              defaultValue=""
              placeholder="Search message, name, or email..."
              label="Support"
            />
            <FilterSelect
              name="statuses"
              label="Status"
              defaultValue=""
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
                  <th className="pb-2 font-medium">Created</th>
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
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          fb.status === "new"
                            ? "bg-blue-50 text-blue-700"
                            : fb.status === "open"
                              ? "bg-yellow-50 text-yellow-700"
                              : fb.status === "resolved"
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {fb.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">
                      {fb.assignedTo ?? "—"}
                    </td>
                    <td className="py-2 text-gray-600">{fb.created}</td>
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
