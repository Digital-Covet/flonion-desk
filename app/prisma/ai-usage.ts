import { UNATTRIBUTED } from "../components/data/aiUsage";
import { db } from "./db";
import { type PageParams, type PageResult, pageResult } from "./paging";
import { daysAgo, formatDate } from "./time";

export type AiUsageSort = "createdAt" | "latencyMs";

export interface AiUsageFilters {
  endpoint: string | null;
  stage: string | null;
  model: string | null;
  ok: "yes" | "no" | null;
  userId: string | null;
  businessId: string | null;
  createdWithinDays: number | null;
}

export const AI_USAGE_SORT_KEYS: readonly AiUsageSort[] = [
  "createdAt",
  "latencyMs",
];

function filtered(f: AiUsageFilters) {
  let c = db.orm.public.AiUsage.where((u) => u.id.isNotNull());

  if (f.endpoint) {
    const v = f.endpoint;
    c = c.where((u) => u.endpoint.eq(v));
  }
  if (f.stage) {
    const v = f.stage;
    c = c.where((u) => u.stage.eq(v));
  }
  if (f.model) {
    const v = f.model;
    c = c.where((u) => u.model.eq(v));
  }
  if (f.ok === "yes") c = c.where((u) => u.ok.eq(true));
  if (f.ok === "no") c = c.where((u) => u.ok.eq(false));
  if (f.userId) c = c.where((u) => u.userId.eq(f.userId));
  if (f.businessId === UNATTRIBUTED) {
    c = c.where((u) => u.businessId.isNull());
  } else if (f.businessId) {
    const v = f.businessId;
    c = c.where((u) => u.businessId.eq(v));
  }

  if (f.createdWithinDays !== null) {
    const cutoff = daysAgo(f.createdWithinDays);
    c = c.where((u) => u.createdAt.gte(cutoff));
  }

  return c;
}

export interface AiUsageRow {
  id: string;
  endpoint: string;
  stage: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number | null;
  latencyMs: number;
  ok: boolean;
  errorKind: string | null;
  userName: string | null;
  businessId: string | null;
  businessName: string | null;
  created: string;
}

/** One business's share of the calls matching the current filters. */
export interface AiUsageBusinessRow {
  /** Null for calls the ledger could not attribute to a business. */
  businessId: string | null;
  businessName: string | null;
  calls: number;
  failed: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  /** Percentage of the filtered cost, 0–100. */
  costShare: number;
}

export interface AiUsageData {
  page: PageResult<AiUsageRow>;
  byBusiness: AiUsageBusinessRow[];
  stats: {
    total: number;
    successRate: number;
    totalCost: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    p50Latency: number;
    p95Latency: number;
    rateLimitRejections: number;
  };
}

export async function loadAiUsageList(
  filters: AiUsageFilters,
  params: PageParams<AiUsageSort>,
): Promise<AiUsageData> {
  const c = filtered(filters);
  const all = db.orm.public.AiUsage;

  // The breakdown ignores the business filter so it stays a way to move
  // between businesses; every other filter (endpoint, model, window) applies.
  const scoped = filtered({ ...filters, businessId: null });

  // Everything that does not depend on another result runs in this one wave.
  const [
    rows,
    matching,
    totals,
    okCount,
    rejections,
    groups,
    failedGroups,
    businesses,
  ] = await Promise.all([
    c
      .select(
        "id",
        "endpoint",
        "stage",
        "model",
        "promptTokens",
        "completionTokens",
        "costUsd",
        "latencyMs",
        "ok",
        "errorKind",
        "userId",
        "businessId",
        "createdAt",
      )
      .orderBy([
        (u) => {
          const field = params.sort === "latencyMs" ? u.latencyMs : u.createdAt;
          return params.dir === "asc" ? field.asc() : field.desc();
        },
        (u) => u.id.asc(),
      ])
      .offset(params.offset)
      .limit(params.size)
      .all(),

    c.aggregate((a) => ({ n: a.count() })),
    all.aggregate((a) => ({
      n: a.count(),
      cost: a.sum("costUsd"),
      prompt: a.sum("promptTokens"),
      completion: a.sum("completionTokens"),
    })),
    all.where((u) => u.ok.eq(true)).aggregate((a) => ({ n: a.count() })),
    all
      .where((u) => u.errorKind.eq("rate_limit"))
      .aggregate((a) => ({ n: a.count() })),
    // One row per business, so the grouped result is bounded by tenant count
    // and sorting it in JS is cheap.
    scoped.groupBy("businessId").aggregate((a) => ({
      calls: a.count(),
      promptTokens: a.sum("promptTokens"),
      completionTokens: a.sum("completionTokens"),
      costUsd: a.sum("costUsd"),
    })),
    scoped
      .where((u) => u.ok.eq(false))
      .groupBy("businessId")
      .aggregate((a) => ({ n: a.count() })),
    // Names for the breakdown and the page rows. Bounded by tenant count, the
    // same assumption the breakdown makes, so it need not wait for the ids.
    db.orm.public.Business.select("id", "name").all(),
  ]);

  // The ledger grows with every AI call, so percentiles are read from the
  // database one row each (the row at that rank by latency) instead of pulling
  // every matching latency into memory to sort.
  const latencyAt = async (fraction: number) => {
    if (matching.n === 0) return 0;
    const [row] = await c
      .select("latencyMs")
      .orderBy((u) => u.latencyMs.asc())
      .offset(Math.floor(matching.n * fraction))
      .limit(1)
      .all();
    return row?.latencyMs ?? 0;
  };
  const userIds = [
    ...new Set(rows.map((r) => r.userId).filter((id): id is string => !!id)),
  ];

  const [p50, p95, users] = await Promise.all([
    latencyAt(0.5),
    latencyAt(0.95),
    userIds.length === 0
      ? []
      : db.orm.public.User.where((u) => u.id.in(userIds))
          .select("id", "name")
          .all(),
  ]);
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const failedBy = new Map(failedGroups.map((g) => [g.businessId, g.n]));

  const scopedCost = groups.reduce((s, g) => s + Number(g.costUsd ?? 0), 0);
  const byBusiness: AiUsageBusinessRow[] = groups
    .map((g) => {
      const cost = Number(g.costUsd ?? 0);
      return {
        businessId: g.businessId,
        // A ledger row outlives a deleted business, so a missing name is
        // shown as such rather than dropped from the totals.
        businessName:
          g.businessId === null
            ? null
            : (businessName.get(g.businessId) ?? "Deleted business"),
        calls: g.calls,
        failed: failedBy.get(g.businessId) ?? 0,
        promptTokens: g.promptTokens ?? 0,
        completionTokens: g.completionTokens ?? 0,
        costUsd: cost,
        costShare: scopedCost > 0 ? (cost / scopedCost) * 100 : 0,
      };
    })
    .sort(
      (a, b) =>
        b.costUsd - a.costUsd ||
        b.promptTokens +
          b.completionTokens -
          (a.promptTokens + a.completionTokens) ||
        b.calls - a.calls,
    );

  const listRows: AiUsageRow[] = rows.map((r) => ({
    id: r.id,
    endpoint: r.endpoint,
    stage: r.stage,
    model: r.model,
    promptTokens: r.promptTokens,
    completionTokens: r.completionTokens,
    costUsd: r.costUsd === null ? null : Number(r.costUsd),
    latencyMs: r.latencyMs,
    ok: r.ok,
    errorKind: r.errorKind,
    userName: r.userId ? (userName.get(r.userId) ?? null) : null,
    businessId: r.businessId,
    businessName: r.businessId
      ? (businessName.get(r.businessId) ?? "Deleted business")
      : null,
    created: formatDate(r.createdAt),
  }));

  return {
    page: pageResult(listRows, matching.n, params),
    byBusiness,
    stats: {
      total: totals.n,
      successRate: totals.n > 0 ? Math.round((okCount.n / totals.n) * 100) : 0,
      totalCost: totals.cost ? Number(totals.cost) : 0,
      totalPromptTokens: totals.prompt ?? 0,
      totalCompletionTokens: totals.completion ?? 0,
      p50Latency: p50,
      p95Latency: p95,
      rateLimitRejections: rejections.n,
    },
  };
}
