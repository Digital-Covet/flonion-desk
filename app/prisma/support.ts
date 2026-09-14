import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "./db";
import {
  likeTerm,
  type PageParams,
  type PageResult,
  pageResult,
} from "./paging";
import { daysAgo, formatDate } from "./time";

export type SupportSort = "createdAt";

export interface SupportFilters {
  q: string | null;
  categories: string[];
  statuses: string[];
  rating: number | null;
  createdWithinDays: number | null;
}

export const SUPPORT_SORT_KEYS: readonly SupportSort[] = ["createdAt"];

function filtered(f: SupportFilters) {
  let c = db.orm.public.Feedback.where((fb) => fb.id.isNotNull());

  const term = likeTerm(f.q);
  if (term) {
    c = c.where((fb) =>
      or(fb.message.ilike(term), fb.name.ilike(term), fb.email.ilike(term)),
    );
  }

  if (f.categories.length > 0) {
    const cats = f.categories;
    c = c.where((fb) => fb.category.in(cats));
  }

  if (f.statuses.length > 0) {
    const statuses = f.statuses;
    c = c.where((fb) => fb.status.in(statuses));
  }

  if (f.rating !== null) {
    const r = f.rating;
    c = c.where((fb) => fb.rating.eq(r));
  }

  if (f.createdWithinDays !== null) {
    const cutoff = daysAgo(f.createdWithinDays);
    c = c.where((fb) => fb.createdAt.gte(cutoff));
  }

  return c;
}

export interface SupportRow {
  id: string;
  name: string;
  email: string;
  category: string;
  rating: number;
  message: string;
  status: string;
  assignedTo: string | null;
  operatorNote: string | null;
  created: string;
}

export interface SupportData {
  page: PageResult<SupportRow>;
  stats: {
    total: number;
    newCount: number;
    openCount: number;
    resolvedCount: number;
  };
}

export async function loadSupportList(
  filters: SupportFilters,
  params: PageParams<SupportSort>,
): Promise<SupportData> {
  const c = filtered(filters);
  const all = db.orm.public.Feedback;

  const [rows, matching, total, newCount, openCount, resolvedCount] =
    await Promise.all([
      c
        .select(
          "id",
          "name",
          "email",
          "category",
          "rating",
          "message",
          "status",
          "assignedTo",
          "operatorNote",
          "createdAt",
        )
        .orderBy([(fb) => fb.createdAt.desc(), (fb) => fb.id.asc()])
        .offset(params.offset)
        .limit(params.size)
        .all(),

      c.aggregate((a) => ({ n: a.count() })),
      all.aggregate((a) => ({ n: a.count() })),
      all
        .where((fb) => fb.status.eq("new"))
        .aggregate((a) => ({ n: a.count() })),
      all
        .where((fb) => fb.status.eq("open"))
        .aggregate((a) => ({ n: a.count() })),
      all
        .where((fb) => fb.status.eq("resolved"))
        .aggregate((a) => ({ n: a.count() })),
    ]);

  const listRows: SupportRow[] = rows.map((fb) => ({
    id: fb.id,
    name: fb.name,
    email: fb.email,
    category: fb.category,
    rating: fb.rating,
    message: fb.message,
    status: fb.status,
    assignedTo: fb.assignedTo,
    operatorNote: fb.operatorNote,
    created: formatDate(fb.createdAt),
  }));

  return {
    page: pageResult(listRows, matching.n, params),
    stats: {
      total: total.n,
      newCount: newCount.n,
      openCount: openCount.n,
      resolvedCount: resolvedCount.n,
    },
  };
}
