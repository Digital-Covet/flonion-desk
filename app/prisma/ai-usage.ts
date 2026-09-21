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
  if (f.businessId) c = c.where((u) => u.businessId.eq(f.businessId));

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
  businessName: string | null;
  created: string;
}

export interface AiUsageData {
  page: PageResult<AiUsageRow>;
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

  const [
    rows,
    matching,
    totalAgg,
    okCount,
    costSum,
    promptSum,
    completionSum,
    rejections,
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
    all.aggregate((a) => ({ n: a.count() })),
    all.where((u) => u.ok.eq(true)).aggregate((a) => ({ n: a.count() })),
    all.aggregate((a) => ({ n: a.sum("costUsd") })),
    all.aggregate((a) => ({ n: a.sum("promptTokens") })),
    all.aggregate((a) => ({ n: a.sum("completionTokens") })),
    all
      .where((u) => u.errorKind.eq("rate_limit"))
      .aggregate((a) => ({ n: a.count() })),
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
  const [p50, p95] = await Promise.all([latencyAt(0.5), latencyAt(0.95)]);

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
    userName: null,
    businessName: null,
    created: formatDate(r.createdAt),
  }));

  return {
    page: pageResult(listRows, matching.n, params),
    stats: {
      total: totalAgg.n,
      successRate:
        totalAgg.n > 0 ? Math.round((okCount.n / totalAgg.n) * 100) : 0,
      totalCost: costSum.n ? Number(costSum.n) : 0,
      totalPromptTokens: promptSum.n ?? 0,
      totalCompletionTokens: completionSum.n ?? 0,
      p50Latency: p50,
      p95Latency: p95,
      rateLimitRejections: rejections.n,
    },
  };
}
