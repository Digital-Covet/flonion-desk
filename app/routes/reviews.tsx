import { useOutletContext } from "react-router";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { SearchField } from "../components/ui/FilterSelect";
import { clientIp, recordAudit } from "../prisma/audit";
import { db } from "../prisma/db";
import { readFailure } from "../prisma/loader-error";
import { requireOperator, requireOperatorRead } from "../prisma/operator";
import { readPageParams, readWindowDays } from "../prisma/paging";
import { loadReviewList, REVIEW_SORT_KEYS } from "../prisma/reviews";
import { toStamp } from "../prisma/time";
import type { Route } from "./+types/reviews";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Reviews" },
    { name: "description", content: "Shared reviews across all businesses." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireOperatorRead(request);
  const url = new URL(request.url);
  const params = readPageParams(url, REVIEW_SORT_KEYS);

  // Non-numeric entries are dropped rather than passed to the query as NaN.
  const ratings =
    url.searchParams
      .get("ratings")
      ?.split(",")
      .filter(Boolean)
      .map(Number)
      .filter(Number.isInteger) ?? [];
  const statuses =
    url.searchParams.get("statuses")?.split(",").filter(Boolean) ?? [];

  const filters = {
    q: url.searchParams.get("q"),
    ratings,
    statuses,
    hasAnalytics: url.searchParams.get("hasAnalytics") as "yes" | "no" | null,
    businessId: url.searchParams.get("businessId"),
    createdWithinDays: readWindowDays(url.searchParams),
  };

  try {
    return {
      data: await loadReviewList(filters, params),
      params,
      error: null,
    };
  } catch (cause) {
    return { data: null, params, error: readFailure("reviews", cause) };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const operator = await requireOperator(request);
  const body = await request.json();
  const intent = body.intent as string;
  const reviewId = body.reviewId as string;
  const ip = clientIp(request);

  const r = await db.orm.public.SharedReview.where((x) => x.id.eq(reviewId))
    .select("id", "text", "rating", "status")
    .first();
  if (!r) {
    return Response.json({ error: "Review not found" }, { status: 404 });
  }

  const now = toStamp(Date.now());

  switch (intent) {
    case "hide-review": {
      await db.transaction(async (tx) => {
        await tx.orm.public.SharedReview.where((x) => x.id.eq(reviewId)).update(
          { status: "hidden", hiddenById: operator.id, hiddenAt: now },
        );
        await recordAudit(tx, operator, {
          action: "review.hide",
          entity: "shared_review",
          entityId: reviewId,
          before: { status: r.status },
          after: { status: "hidden" },
          ip,
        });
      });
      return { ok: true };
    }

    case "unhide-review": {
      await db.transaction(async (tx) => {
        await tx.orm.public.SharedReview.where((x) => x.id.eq(reviewId)).update(
          { status: "visible", hiddenById: null, hiddenAt: null },
        );
        await recordAudit(tx, operator, {
          action: "review.unhide",
          entity: "shared_review",
          entityId: reviewId,
          before: { status: r.status },
          after: { status: "visible" },
          ip,
        });
      });
      return { ok: true };
    }

    case "flag-review": {
      await db.transaction(async (tx) => {
        await tx.orm.public.SharedReview.where((x) => x.id.eq(reviewId)).update(
          { status: "flagged", hiddenById: operator.id, hiddenAt: now },
        );
        await recordAudit(tx, operator, {
          action: "review.flag",
          entity: "shared_review",
          entityId: reviewId,
          before: { status: r.status },
          after: { status: "flagged" },
          ip,
        });
      });
      return { ok: true };
    }

    case "redact-text": {
      await db.transaction(async (tx) => {
        await tx.orm.public.SharedReview.where((x) => x.id.eq(reviewId)).update(
          { text: "[redacted by operator]" },
        );
        await recordAudit(tx, operator, {
          action: "review.redact",
          entity: "shared_review",
          entityId: reviewId,
          before: { text: r.text },
          after: { text: "[redacted by operator]" },
          ip,
        });
      });
      return { ok: true };
    }

    case "delete-review": {
      const confirmName = body.confirmName as string;
      if (confirmName !== String(r.rating)) {
        return Response.json(
          { error: "Rating does not match" },
          { status: 400 },
        );
      }
      await db.transaction(async (tx) => {
        await tx.orm.public.SharedReview.where((x) =>
          x.id.eq(reviewId),
        ).delete();
        await recordAudit(tx, operator, {
          action: "review.delete",
          entity: "shared_review",
          entityId: reviewId,
          before: { text: r.text, rating: r.rating },
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

export default function Reviews({ loaderData }: Route.ComponentProps) {
  const { data, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="Reviews" operator={operator} />

      {data === null ? (
        <SectionError
          title="Reviews unavailable"
          detail="The platform database could not be read."
          error={error}
        />
      ) : (
        <>
          <StatRow
            items={[
              { id: "total", label: "Reviews", value: data.stats.total },
              { id: "avg", label: "Avg rating", value: data.stats.avgRating },
              { id: "ai", label: "AI copies", value: data.stats.totalAiCopies },
            ]}
          />

          <FilterBar active={false}>
            <SearchField
              name="q"
              defaultValue=""
              placeholder="Search review text..."
              label="Reviews"
            />
          </FilterBar>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Rating</th>
                  <th className="pb-2 font-medium">Text</th>
                  <th className="pb-2 font-medium">Reviewer</th>
                  <th className="pb-2 font-medium">Business</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">AI copies</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.page.rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{r.rating}/5</td>
                    <td className="py-2 text-gray-600 max-w-[250px] truncate">
                      {r.text || "—"}
                    </td>
                    <td className="py-2">{r.reviewerName ?? "Anonymous"}</td>
                    <td className="py-2 text-gray-600">
                      {r.businessName ?? "Unattached"}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          r.status === "visible"
                            ? "bg-green-50 text-green-700"
                            : r.status === "hidden"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2">{r.analyticsAiCopyCount}</td>
                    <td className="py-2 text-gray-600">{r.created}</td>
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
