import { db } from "./db";
import { type PageParams, type PageResult, pageResult } from "./paging";
import { daysAgo, formatDate } from "./time";

export type MeetingSort = "createdAt";

export interface MeetingFilters {
  statuses: string[];
  businessId: string | null;
  hasMeetLink: "yes" | "no" | null;
  upcoming: "yes" | "no" | null;
  createdWithinDays: number | null;
}

export const MEETING_SORT_KEYS: readonly MeetingSort[] = ["createdAt"];

function filteredRequest(f: MeetingFilters) {
  let c = db.orm.public.MeetingRequest.where((m) => m.id.isNotNull());

  if (f.statuses.length > 0) {
    const statuses = f.statuses;
    c = c.where((m) => m.status.in(statuses));
  }

  if (f.businessId) {
    const bid = f.businessId;
    c = c.where((m) => m.businessId.eq(bid));
  }

  if (f.hasMeetLink === "yes") c = c.where((m) => m.meetUri.isNotNull());
  if (f.hasMeetLink === "no") c = c.where((m) => m.meetUri.isNull());

  if (f.createdWithinDays !== null) {
    const cutoff = daysAgo(f.createdWithinDays);
    c = c.where((m) => m.createdAt.gte(cutoff));
  }

  return c;
}

export interface MeetingRequestRow {
  id: string;
  slotDate: string;
  slotTime: string;
  businessName: string;
  requesterName: string;
  isGuest: boolean;
  status: string;
  hasMeetLink: boolean;
  created: string;
}

export interface TeamMeetingRow {
  id: string;
  title: string;
  businessName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  hasMeetLink: boolean;
}

export interface MeetingData {
  requests: PageResult<MeetingRequestRow>;
  teamMeetings: TeamMeetingRow[];
  stats: {
    pendingRequests: number;
    statusBreakdown: Record<string, number>;
    guestRequests: number;
    memberRequests: number;
  };
}

export async function loadMeetingList(
  filters: MeetingFilters,
  params: PageParams<MeetingSort>,
): Promise<MeetingData> {
  const c = filteredRequest(filters);
  const all = db.orm.public.MeetingRequest;

  const [rows, matching, pendingCount, statusGroups, guestCount, teamMeetings] =
    await Promise.all([
      c
        .select(
          "id",
          "status",
          "createdAt",
          "guestName",
          "guestEmail",
          "meetUri",
        )
        .include("slot", (s) => s.select("date", "startTime"))
        .include("business", (b) => b.select("name"))
        .include("requester", (r) => r.select("name"))
        .orderBy([(m) => m.createdAt.desc(), (m) => m.id.asc()])
        .offset(params.offset)
        .limit(params.size)
        .all(),

      c.aggregate((a) => ({ n: a.count() })),
      all
        .where((m) => m.status.eq("pending"))
        .aggregate((a) => ({ n: a.count() })),
      all.groupBy("status").aggregate((a) => ({ n: a.count() })),
      c
        .where((m) => m.requesterId.isNull())
        .aggregate((a) => ({ n: a.count() })),
      db.orm.public.TeamMeeting.select(
        "id",
        "title",
        "date",
        "startTime",
        "endTime",
        "location",
        "meetUri",
      )
        .include("business", (b) => b.select("name"))
        .orderBy([(tm) => tm.date.desc()])
        .all(),
    ]);

  const requestRows: MeetingRequestRow[] = rows.map((m) => ({
    id: m.id,
    slotDate: m.slot?.date ?? "Unknown",
    slotTime: m.slot?.startTime ?? "Unknown",
    businessName: m.business?.name ?? "Unknown",
    requesterName: m.guestName ?? m.requester?.name ?? "Unknown",
    isGuest: m.guestName !== null,
    status: m.status,
    hasMeetLink: m.meetUri !== null,
    created: formatDate(m.createdAt),
  }));

  const teamRows: TeamMeetingRow[] = teamMeetings.map((tm) => ({
    id: tm.id,
    title: tm.title,
    businessName: tm.business?.name ?? "Unknown",
    date: tm.date,
    startTime: tm.startTime,
    endTime: tm.endTime,
    location: tm.location,
    hasMeetLink: tm.meetUri !== null,
  }));

  const statusBreakdown: Record<string, number> = {};
  for (const g of statusGroups) {
    statusBreakdown[g.status] = g.n;
  }

  return {
    requests: pageResult(requestRows, matching.n, params),
    teamMeetings: teamRows,
    stats: {
      pendingRequests: pendingCount.n,
      statusBreakdown,
      guestRequests: guestCount.n,
      memberRequests: matching.n - guestCount.n,
    },
  };
}
