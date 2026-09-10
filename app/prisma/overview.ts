import type { ChartPoint, OverviewData, StatFigure } from "../components/types";
import { db } from "./db";

/**
 * Every read behind the operator overview.
 *
 * This module is server-only: `db` is imported here and in the route loader,
 * never in a component. Everything returned is plain JSON — dates are already
 * formatted, because the server and the operator's browser can sit in
 * different timezones and formatting twice would break hydration.
 *
 * The screen is read-only. Nothing here writes.
 */

/** Weekly buckets shown by both charts: the last 8 weeks, ending today. */
const CHART_WEEKS = 8;

/** Comparison window for the "Since last month" deltas on the stat tiles. */
const DELTA_DAYS = 30;

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Upper bound on the timestamp columns pulled back for bucketing.
 *
 * The window maths runs in JS rather than SQL because this release decodes
 * `Timestamp` columns to `Temporal.PlainDateTime`, and no lib in this
 * toolchain declares the `Temporal` global — so a cutoff value cannot be
 * constructed in typed code to pass to `.gte()`. Timestamps are narrow, but
 * the cap keeps a growing table from being read in full.
 */
const TIMESTAMP_ROW_CAP = 20_000;

/** Rows in the recent-businesses table. */
const RECENT_BUSINESS_LIMIT = 6;

/** Rows in the activity feed, per source and after merging. */
const ACTIVITY_LIMIT = 8;

/**
 * A decoded `Timestamp(3)` column. The ORM hands back a Temporal
 * `PlainDateTime`, which types as `any` here for the reason above, so the
 * fields it is read through are named explicitly.
 */
type PlainDateTimeLike = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/** Wall-clock parts to epoch millis, for ordering and bucketing only. */
function toMillis(ts: PlainDateTimeLike): number {
  return Date.UTC(ts.year, ts.month - 1, ts.day, ts.hour, ts.minute);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "12 Aug" — the label under a chart bucket. */
function formatDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "12 AUG 14:05" — the timestamp under an activity row. */
function formatStamp(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]?.toUpperCase()} ${hh}:${mm}`;
}

/** Start of the bucket window: `CHART_WEEKS` whole weeks back from tomorrow. */
function chartWindow(now: number) {
  const endExclusive = Math.floor(now / DAY_MS) * DAY_MS + DAY_MS;
  return { endExclusive, start: endExclusive - CHART_WEEKS * WEEK_MS };
}

/** Drop a list of event times into the weekly buckets. */
function bucketWeekly(times: number[], now: number): ChartPoint[] {
  const { start } = chartWindow(now);
  const counts = new Array<number>(CHART_WEEKS).fill(0);

  for (const t of times) {
    const index = Math.floor((t - start) / WEEK_MS);
    if (index >= 0 && index < CHART_WEEKS) {
      counts[index] = (counts[index] ?? 0) + 1;
    }
  }

  return counts.map((value, index) => ({
    label: formatDay(start + index * WEEK_MS),
    value,
  }));
}

/**
 * Compare the last `DELTA_DAYS` against the `DELTA_DAYS` before them.
 *
 * A percentage is only meaningful when the earlier window had something in
 * it; when it was empty the raw increase is shown instead, and when both are
 * empty there is no delta to show at all. Nothing here is estimated.
 */
function delta(total: number, current: number, prior: number): StatFigure {
  const positive = current >= prior;

  if (prior > 0) {
    const pct = Math.round(((current - prior) / prior) * 100);
    return { value: total, change: `${pct >= 0 ? "+" : ""}${pct}%`, positive };
  }

  if (current > 0) {
    return { value: total, change: `+${current}`, positive: true };
  }

  return { value: total, positive };
}

/** Sum the weights of the events falling in each of the two delta windows. */
function splitWindows(
  events: { at: number; weight: number }[],
  now: number,
): { current: number; prior: number } {
  const currentStart = now - DELTA_DAYS * DAY_MS;
  const priorStart = now - 2 * DELTA_DAYS * DAY_MS;

  let current = 0;
  let prior = 0;
  for (const { at, weight } of events) {
    if (at >= currentStart) current += weight;
    else if (at >= priorStart) prior += weight;
  }
  return { current, prior };
}

export async function loadOverview(): Promise<OverviewData> {
  const o = db.orm.public;
  const now = Date.now();

  const [
    businessTotal,
    verifiedTotal,
    reviewTotal,
    aiTotal,
    qrTotal,
    googleTotal,
    twoFactorTotal,
    businessTimes,
    userTimes,
    reviewTimes,
    analyticsRows,
    recentBusinesses,
    joinRequests,
    invitations,
    feedback,
  ] = await Promise.all([
    o.Business.aggregate((a) => ({ n: a.count() })),
    o.User.where((u) => u.emailVerified.eq(true)).aggregate((a) => ({
      n: a.count(),
    })),
    o.SharedReview.aggregate((a) => ({ n: a.count() })),
    o.ReviewAnalytics.aggregate((a) => ({ n: a.sum("aiCopyCount") })),
    o.Business.aggregate((a) => ({ n: a.sum("qrScanCount") })),
    o.GoogleToken.aggregate((a) => ({ n: a.count() })),
    o.User.where((u) => u.twoFactorEnabled.eq(true)).aggregate((a) => ({
      n: a.count(),
    })),

    o.Business.select("createdAt").limit(TIMESTAMP_ROW_CAP).all(),
    // Only verified users count as signups, to match the tile they feed.
    o.User.where((u) => u.emailVerified.eq(true))
      .select("createdAt")
      .limit(TIMESTAMP_ROW_CAP)
      .all(),
    o.SharedReview.select("createdAt").limit(TIMESTAMP_ROW_CAP).all(),
    o.ReviewAnalytics.select("createdAt", "aiCopyCount")
      .limit(TIMESTAMP_ROW_CAP)
      .all(),

    o.Business.select("id", "name", "sector", "rating", "reviewCount")
      .include("user", (u) => u.select("onboardingCompleted"))
      .orderBy((b) => b.createdAt.desc())
      .limit(RECENT_BUSINESS_LIMIT)
      .all(),

    o.JoinRequest.select("id", "createdAt")
      .include("user", (u) => u.select("name"))
      .include("business", (b) => b.select("name"))
      .orderBy((j) => j.createdAt.desc())
      .limit(ACTIVITY_LIMIT)
      .all(),
    o.Invitation.select("id", "email", "role", "createdAt")
      .include("business", (b) => b.select("name"))
      .orderBy((i) => i.createdAt.desc())
      .limit(ACTIVITY_LIMIT)
      .all(),
    o.Feedback.select("id", "name", "category", "rating", "createdAt")
      .orderBy((f) => f.createdAt.desc())
      .limit(ACTIVITY_LIMIT)
      .all(),
  ]);

  const businessWindow = splitWindows(
    businessTimes.map((b) => ({ at: toMillis(b.createdAt), weight: 1 })),
    now,
  );
  const userWindow = splitWindows(
    userTimes.map((u) => ({ at: toMillis(u.createdAt), weight: 1 })),
    now,
  );
  const reviewWindow = splitWindows(
    reviewTimes.map((r) => ({ at: toMillis(r.createdAt), weight: 1 })),
    now,
  );
  // aiCopyCount is a running counter on the analytics row rather than one row
  // per generation, so a window credits the whole counter to the row's own
  // creation date. It is the only timestamp the model carries.
  const aiWindow = splitWindows(
    analyticsRows.map((r) => ({
      at: toMillis(r.createdAt),
      weight: r.aiCopyCount,
    })),
    now,
  );

  return {
    stats: {
      businesses: delta(
        businessTotal.n,
        businessWindow.current,
        businessWindow.prior,
      ),
      verifiedUsers: delta(
        verifiedTotal.n,
        userWindow.current,
        userWindow.prior,
      ),
      reviews: delta(reviewTotal.n, reviewWindow.current, reviewWindow.prior),
      aiGenerations: delta(aiTotal.n ?? 0, aiWindow.current, aiWindow.prior),
    },
    health: [
      { id: "qrScans", label: "QR scans", value: qrTotal.n ?? 0 },
      { id: "google", label: "Google connections", value: googleTotal.n },
      { id: "twoFactor", label: "2FA enabled", value: twoFactorTotal.n },
    ],
    signups: bucketWeekly(
      userTimes.map((u) => toMillis(u.createdAt)),
      now,
    ),
    reviews: bucketWeekly(
      reviewTimes.map((r) => toMillis(r.createdAt)),
      now,
    ),
    recentBusinesses: recentBusinesses.map((b) => ({
      id: b.id,
      name: b.name,
      sector: b.sector,
      rating: b.rating,
      reviewCount: b.reviewCount,
      onboardingCompleted: b.user.onboardingCompleted,
    })),
    activity: [
      ...joinRequests.map((j) => ({
        id: `join-${j.id}`,
        kind: "join" as const,
        title: `${j.user.name} asked to join ${j.business.name}`,
        at: toMillis(j.createdAt),
      })),
      ...invitations.map((i) => ({
        id: `invite-${i.id}`,
        kind: "invite" as const,
        title: `${i.email} invited to ${i.business.name} as ${i.role}`,
        at: toMillis(i.createdAt),
      })),
      ...feedback.map((f) => ({
        id: `feedback-${f.id}`,
        kind: "feedback" as const,
        title: `${f.name} rated ${f.category} ${f.rating}/5`,
        at: toMillis(f.createdAt),
      })),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, ACTIVITY_LIMIT)
      .map(({ id, kind, title, at }) => ({
        id,
        kind,
        title,
        date: formatStamp(at),
      })),
  };
}
