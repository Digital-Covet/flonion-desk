import { Tabs } from "@base-ui/react/tabs";
import { useOutletContext } from "react-router";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { FilterSelect } from "../components/ui/FilterSelect";
import { clientIp, recordAudit } from "../prisma/audit";
import { db } from "../prisma/db";
import { readFailure } from "../prisma/loader-error";
import { loadMeetingList, MEETING_SORT_KEYS } from "../prisma/meetings";
import { requireOperator, requireOperatorRead } from "../prisma/operator";
import { readPageParams } from "../prisma/paging";
import { toStamp } from "../prisma/time";
import type { Route } from "./+types/meetings";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Meetings" },
    { name: "description", content: "Meeting requests and team meetings." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireOperatorRead(request);
  const url = new URL(request.url);
  const params = readPageParams(url, MEETING_SORT_KEYS);

  const statuses =
    url.searchParams.get("statuses")?.split(",").filter(Boolean) ?? [];
  const filters = {
    statuses,
    businessId: url.searchParams.get("businessId"),
    hasMeetLink: url.searchParams.get("hasMeetLink") as "yes" | "no" | null,
    upcoming: url.searchParams.get("upcoming") as "yes" | "no" | null,
    createdWithinDays: url.searchParams.get("createdWithinDays")
      ? Number.parseInt(url.searchParams.get("createdWithinDays") ?? "0", 10)
      : null,
  };

  try {
    return {
      data: await loadMeetingList(filters, params),
      params,
      error: null,
    };
  } catch (cause) {
    return { data: null, params, error: readFailure("meetings", cause) };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const operator = await requireOperator(request);
  const body = await request.json();
  const intent = body.intent as string;
  const meetingId = body.meetingId as string;
  const ip = clientIp(request);

  const now = toStamp(Date.now());

  switch (intent) {
    case "set-meeting-status": {
      const status = body.status as string;
      const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
      if (!validStatuses.includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }

      const mr = await db.orm.public.MeetingRequest.where((x) =>
        x.id.eq(meetingId),
      )
        .select("id", "status", "slotId")
        .first();
      if (!mr) {
        return Response.json(
          { error: "Meeting request not found" },
          { status: 404 },
        );
      }

      await db.transaction(async (tx) => {
        // If cancelling, free the slot in the same transaction
        const slotId = mr.slotId;
        if (status === "cancelled" && slotId) {
          await tx.orm.public.AvailabilitySlot.where((s) =>
            s.id.eq(slotId),
          ).update({ isBooked: false });
        }

        await tx.orm.public.MeetingRequest.where((x) =>
          x.id.eq(meetingId),
        ).update({ status, updatedAt: now });

        await recordAudit(tx, operator, {
          action: "meeting.set_status",
          entity: "meeting_request",
          entityId: meetingId,
          before: { status: mr.status },
          after: { status },
          ip,
        });
      });

      return { ok: true };
    }

    case "clear-meet-link": {
      await db.transaction(async (tx) => {
        await tx.orm.public.MeetingRequest.where((x) =>
          x.id.eq(meetingId),
        ).update({ meetSpaceId: null, meetUri: null, updatedAt: now });

        await recordAudit(tx, operator, {
          action: "meeting.clear_meet_link",
          entity: "meeting_request",
          entityId: meetingId,
          note: "Cleared dead Meet link",
          ip,
        });
      });

      return { ok: true };
    }

    case "delete-meeting": {
      await db.transaction(async (tx) => {
        await tx.orm.public.MeetingRequest.where((x) =>
          x.id.eq(meetingId),
        ).delete();
        await recordAudit(tx, operator, {
          action: "meeting.delete",
          entity: "meeting_request",
          entityId: meetingId,
          ip,
        });
      });
      return { ok: true };
    }

    case "delete-team-meeting": {
      await db.transaction(async (tx) => {
        await tx.orm.public.TeamMeeting.where((x) =>
          x.id.eq(meetingId),
        ).delete();
        await recordAudit(tx, operator, {
          action: "team_meeting.delete",
          entity: "team_meeting",
          entityId: meetingId,
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

export default function Meetings({ loaderData }: Route.ComponentProps) {
  const { data, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="Meetings" operator={operator} />

      {data === null ? (
        <SectionError
          title="Meetings unavailable"
          detail="The platform database could not be read."
          error={error}
        />
      ) : (
        <>
          <StatRow
            items={[
              {
                id: "pending",
                label: "Pending requests",
                value: data.stats.pendingRequests,
              },
              {
                id: "guest",
                label: "Guest requests",
                value: data.stats.guestRequests,
              },
              {
                id: "member",
                label: "Member requests",
                value: data.stats.memberRequests,
              },
            ]}
          />

          <FilterBar active={false}>
            <FilterSelect
              name="statuses"
              label="Status"
              defaultValue=""
              placeholder="All statuses"
              options={[
                { value: "pending", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
                { value: "cancelled", label: "Cancelled" },
                { value: "completed", label: "Completed" },
              ]}
            />
          </FilterBar>

          <Tabs.Root defaultValue="requests" className="flex flex-col gap-4">
            <Tabs.List className="relative z-1 -mb-px flex gap-1 border-b border-gray-100">
              <Tabs.Tab
                value="requests"
                className="flex h-[calc(2.5rem+1px)] items-center justify-center bg-transparent px-4 py-0 font-inherit text-sm font-normal leading-5 whitespace-nowrap text-gray-400 outline-none select-none hover:text-[#2D3748] focus-visible:outline-2 focus-visible:outline-teal-400 data-active:text-[#2D3748] data-active:font-semibold"
              >
                Meeting Requests
              </Tabs.Tab>
              <Tabs.Tab
                value="team"
                className="flex h-[calc(2.5rem+1px)] items-center justify-center bg-transparent px-4 py-0 font-inherit text-sm font-normal leading-5 whitespace-nowrap text-gray-400 outline-none select-none hover:text-[#2D3748] focus-visible:outline-2 focus-visible:outline-teal-400 data-active:text-[#2D3748] data-active:font-semibold"
              >
                Team Meetings
              </Tabs.Tab>
              <Tabs.Indicator className="tabs-indicator" />
            </Tabs.List>

            <Tabs.Panel value="requests" className="outline-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Business</th>
                      <th className="pb-2 font-medium">Requester</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Meet</th>
                      <th className="pb-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requests.rows.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-2">{r.slotDate}</td>
                        <td className="py-2">{r.slotTime}</td>
                        <td className="py-2">{r.businessName}</td>
                        <td className="py-2">{r.requesterName}</td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                              r.isGuest
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {r.isGuest ? "Guest" : "Member"}
                          </span>
                        </td>
                        <td className="py-2">{r.status}</td>
                        <td className="py-2">{r.hasMeetLink ? "Yes" : "—"}</td>
                        <td className="py-2 text-gray-600">{r.created}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.requests} />
            </Tabs.Panel>

            <Tabs.Panel value="team" className="outline-none">
              {data.teamMeetings.length === 0 ? (
                <p className="text-sm text-gray-500">No team meetings found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 font-medium">Title</th>
                        <th className="pb-2 font-medium">Business</th>
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Time</th>
                        <th className="pb-2 font-medium">Location</th>
                        <th className="pb-2 font-medium">Meet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.teamMeetings.map((tm) => (
                        <tr key={tm.id} className="border-b border-gray-100">
                          <td className="py-2 font-medium">{tm.title}</td>
                          <td className="py-2">{tm.businessName}</td>
                          <td className="py-2">{tm.date}</td>
                          <td className="py-2">
                            {tm.startTime} — {tm.endTime}
                          </td>
                          <td className="py-2 text-gray-600">{tm.location}</td>
                          <td className="py-2">
                            {tm.hasMeetLink ? "Yes" : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Tabs.Panel>
          </Tabs.Root>
        </>
      )}
    </div>
  );
}
