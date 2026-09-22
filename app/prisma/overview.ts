import type { ChartPoint, OverviewData, StatFigure } from "../components/types";
import { db } from "./db";
import {
  daysAgo,
  formatDay,
  formatStamp,
  stampToMillis,
  toStamp,
} from "./time";

/**
 * Every read behind the operator overview.
 *
 * This module is server-only: `db` is imported here and in the route loader,
 * never in a component. Everything returned is plain JSON — dates are already
 * formatted, because the server and the operator's browser can sit in
 * different timezones and formatting twice would break hydration.
 *
 * The screen is read-only. Nothing here writes.
 *
 * Window maths runs in SQL. `Timestamp(3)` columns are bound to the string
 * codec, so a cutoff is just a string and the database does the counting —
 * see `time.ts`. An earlier revision could not do this and compensated by
 * fetching up to 20,000 timestamps per table and bucketing them in JS, which
 * silently produced wrong figures for any table that outgrew the cap.
 */

/** Weekly buckets shown by both charts: the last 8 weeks, ending today. */
const CHART_WEEKS = 8;

/** Comparison window for the "Since last month" deltas on the stat tiles. */
const DELTA_DAYS = 30;

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Rows in the recent-businesses table. */
const RECENT_BUSINESS_LIMIT = 6;

/** Rows in the activity feed, per source and after merging. */
const ACTIVITY_LIMIT = 8;

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

export async function loadOverview(): Promise<OverviewData> {
  const o = db.orm.public;
  const now = Date.now();

  // The two delta windows, as cutoffs the database compares directly. `current`
  // is everything at or after `currentStart`; `prior` is the equal-length window
  // immediately before it, so the two never overlap.
  const currentStart = daysAgo(DELTA_DAYS, now);
  const priorStart = daysAgo(2 * DELTA_DAYS, now);

  // Charts cover whole weeks, which is a slightly different span to the delta
  // windows, so it gets its own cutoff rather than reusing one of theirs.
  const chartStart = toStamp(chartWindow(now).start);

  const [
    businessTotal,
    businessCurrent,
    businessPrior,
    verifiedTotal,
    verifiedCurrent,
    verifiedPrior,
    reviewTotal,
    reviewCurrent,
    reviewPrior,
    aiTotal,
    aiCurrent,
    aiPrior,
    googleTotal,
    twoFactorTotal,
    signupTimes,
    reviewTimes,
    recentBusinesses,
    joinRequests,
    invitations,
    feedback,
  ] = await Promise.all([
    // The QR tile reads the same table unfiltered, so it rides along here.
    o.Business.aggregate((a) => ({ n: a.count(), qr: a.sum("qrScanCount") })),
    o.Business.where((b) => b.createdAt.gte(currentStart)).aggregate((a) => ({
      n: a.count(),
    })),
    o.Business.where((b) => b.createdAt.gte(priorStart))
      .where((b) => b.createdAt.lt(currentStart))
      .aggregate((a) => ({ n: a.count() })),

    // Only verified users count as signups, to match the tile they feed.
    o.User.where((u) => u.emailVerified.eq(true)).aggregate((a) => ({
      n: a.count(),
    })),
    o.User.where((u) => u.emailVerified.eq(true))
      .where((u) => u.createdAt.gte(currentStart))
      .aggregate((a) => ({ n: a.count() })),
    o.User.where((u) => u.emailVerified.eq(true))
      .where((u) => u.createdAt.gte(priorStart))
      .where((u) => u.createdAt.lt(currentStart))
      .aggregate((a) => ({ n: a.count() })),

    o.SharedReview.aggregate((a) => ({ n: a.count() })),
    o.SharedReview.where((r) => r.createdAt.gte(currentStart)).aggregate(
      (a) => ({ n: a.count() }),
    ),
    o.SharedReview.where((r) => r.createdAt.gte(priorStart))
      .where((r) => r.createdAt.lt(currentStart))
      .aggregate((a) => ({ n: a.count() })),

    // aiCopyCount is a running counter on the analytics row rather than one row
    // per generation, so a window credits the whole counter to the row's own
    // creation date. It is the only timestamp the model carries.
    o.ReviewAnalytics.aggregate((a) => ({ n: a.sum("aiCopyCount") })),
    o.ReviewAnalytics.where((r) => r.createdAt.gte(currentStart)).aggregate(
      (a) => ({ n: a.sum("aiCopyCount") }),
    ),
    o.ReviewAnalytics.where((r) => r.createdAt.gte(priorStart))
      .where((r) => r.createdAt.lt(currentStart))
      .aggregate((a) => ({ n: a.sum("aiCopyCount") })),

    o.GoogleToken.aggregate((a) => ({ n: a.count() })),
    o.User.where((u) => u.twoFactorEnabled.eq(true)).aggregate((a) => ({
      n: a.count(),
    })),

    // Chart rows are bounded by the window itself, so no row cap is needed.
    o.User.where((u) => u.emailVerified.eq(true))
      .where((u) => u.createdAt.gte(chartStart))
      .select("createdAt")
      .all(),
    o.SharedReview.where((r) => r.createdAt.gte(chartStart))
      .select("createdAt")
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

  return {
    stats: {
      businesses: delta(businessTotal.n, businessCurrent.n, businessPrior.n),
      verifiedUsers: delta(verifiedTotal.n, verifiedCurrent.n, verifiedPrior.n),
      reviews: delta(reviewTotal.n, reviewCurrent.n, reviewPrior.n),
      aiGenerations: delta(aiTotal.n ?? 0, aiCurrent.n ?? 0, aiPrior.n ?? 0),
    },
    health: [
      { id: "qrScans", label: "QR scans", value: businessTotal.qr ?? 0 },
      { id: "google", label: "Google connections", value: googleTotal.n },
      { id: "twoFactor", label: "2FA enabled", value: twoFactorTotal.n },
    ],
    signups: bucketWeekly(
      signupTimes.map((u) => stampToMillis(u.createdAt)),
      now,
    ),
    reviews: bucketWeekly(
      reviewTimes.map((r) => stampToMillis(r.createdAt)),
      now,
    ),
    recentBusinesses: recentBusinesses.map((b) => ({
      id: b.id,
      name: b.name,
      sector: b.sector,
      rating: b.rating,
      reviewCount: b.reviewCount,
      onboardingCompleted: b.user?.onboardingCompleted ?? false,
    })),
    activity: [
      ...joinRequests.map((j) => ({
        id: `join-${j.id}`,
        kind: "join" as const,
        title: `${j.user?.name ?? "Someone"} asked to join ${j.business?.name ?? "a business"}`,
        at: stampToMillis(j.createdAt),
      })),
      ...invitations.map((i) => ({
        id: `invite-${i.id}`,
        kind: "invite" as const,
        title: `${i.email} invited to ${i.business?.name ?? "a business"} as ${i.role}`,
        at: stampToMillis(i.createdAt),
      })),
      ...feedback.map((f) => ({
        id: `feedback-${f.id}`,
        kind: "feedback" as const,
        title: `${f.name} rated ${f.category} ${f.rating}/5`,
        at: stampToMillis(f.createdAt),
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
