import { db } from "./db";
import {
  likeTerm,
  type PageParams,
  type PageResult,
  pageResult,
} from "./paging";
import { daysAgo, formatDate } from "./time";

export type ReviewSort = "rating" | "createdAt";

export interface ReviewFilters {
  q: string | null;
  ratings: number[];
  statuses: string[];
  hasAnalytics: "yes" | "no" | null;
  businessId: string | null;
  createdWithinDays: number | null;
}

export const REVIEW_SORT_KEYS: readonly ReviewSort[] = ["rating", "createdAt"];

function filtered(f: ReviewFilters) {
  let c = db.orm.public.SharedReview.where((r) => r.id.isNotNull());

  const term = likeTerm(f.q);
  if (term) {
    c = c.where((r) => r.text.ilike(term));
  }

  if (f.ratings.length > 0) {
    const ratings = f.ratings;
    c = c.where((r) => r.rating.in(ratings));
  }

  if (f.statuses.length > 0) {
    const statuses = f.statuses;
    c = c.where((r) => r.status.in(statuses));
  }

  if (f.businessId) {
    c = c.where((r) => r.businessId.eq(f.businessId));
  }

  if (f.createdWithinDays !== null) {
    const cutoff = daysAgo(f.createdWithinDays);
    c = c.where((r) => r.createdAt.gte(cutoff));
  }

  return c;
}

export interface ReviewListRow {
  id: string;
  rating: number;
  text: string;
  reviewerName: string | null;
  keywords: string | null;
  authorName: string;
  businessName: string | null;
  status: string;
  analyticsVisitCount: number;
  analyticsReviewCount: number;
  analyticsQrScanCount: number;
  analyticsRedirectCount: number;
  analyticsAiCopyCount: number;
  created: string;
}

export interface ReviewListData {
  page: PageResult<ReviewListRow>;
  stats: {
    total: number;
    avgRating: number;
    totalAiCopies: number;
    ratingDistribution: Record<number, number>;
  };
}

export async function loadReviewList(
  filters: ReviewFilters,
  params: PageParams<ReviewSort>,
): Promise<ReviewListData> {
  const c = filtered(filters);
  const all = db.orm.public.SharedReview;

  const [rows, matching, totalAgg, ratingSum, aiCopies, distribution] =
    await Promise.all([
      c
        .select(
          "id",
          "rating",
          "text",
          "reviewerName",
          "keywords",
          "status",
          "createdAt",
        )
        .include("user", (u) => u.select("name"))
        .include("business", (b) => b.select("name"))
        .include("reviewAnalytics", (a) =>
          a.select(
            "visitCount",
            "reviewCount",
            "qrScanCount",
            "redirectCount",
            "aiCopyCount",
          ),
        )
        .orderBy([
          (r) => {
            const field = params.sort === "rating" ? r.rating : r.createdAt;
            return params.dir === "asc" ? field.asc() : field.desc();
          },
          (r) => r.id.asc(),
        ])
        .offset(params.offset)
        .limit(params.size)
        .all(),

      c.aggregate((a) => ({ n: a.count() })),
      all.aggregate((a) => ({ n: a.count() })),
      all.aggregate((a) => ({ n: a.sum("rating") })),
      // Summed in the database, platform-wide like the other two stats, rather
      // than fetching one analytics row per matching review.
      db.orm.public.ReviewAnalytics.aggregate((a) => ({
        n: a.sum("aiCopyCount"),
      })),
      all.groupBy("rating").aggregate((a) => ({ n: a.count() })),
    ]);

  const listRows: ReviewListRow[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    text: r.text,
    reviewerName: r.reviewerName,
    keywords: r.keywords,
    authorName: r.user?.name ?? "Unknown",
    businessName: r.business?.name ?? null,
    status: r.status,
    analyticsVisitCount: r.reviewAnalytics?.visitCount ?? 0,
    analyticsReviewCount: r.reviewAnalytics?.reviewCount ?? 0,
    analyticsQrScanCount: r.reviewAnalytics?.qrScanCount ?? 0,
    analyticsRedirectCount: r.reviewAnalytics?.redirectCount ?? 0,
    analyticsAiCopyCount: r.reviewAnalytics?.aiCopyCount ?? 0,
    created: formatDate(r.createdAt),
  }));

  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of distribution) {
    dist[g.rating] = g.n;
  }

  return {
    page: pageResult(listRows, matching.n, params),
    stats: {
      total: totalAgg.n,
      avgRating:
        totalAgg.n > 0 ? Math.round((ratingSum.n ?? 0) / totalAgg.n) : 0,
      totalAiCopies: aiCopies.n ?? 0,
      ratingDistribution: dist,
    },
  };
}
