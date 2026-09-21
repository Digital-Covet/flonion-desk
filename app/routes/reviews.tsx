import { useOutletContext } from "react-router";
import {
  ReviewTable,
  reviewConfirmValue,
} from "../components/reviews/ReviewTable";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { FilterSelect, SearchField } from "../components/ui/FilterSelect";
import { clientIp, recordAudit } from "../prisma/audit";
import { db } from "../prisma/db";
import { readFailure } from "../prisma/loader-error";
import { readBody, readText } from "../prisma/moderation";
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
      filters,
      params,
      error: null,
    };
  } catch (cause) {
    return {
      data: null,
      filters,
      params,
      error: readFailure("reviews", cause),
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const operator = await requireOperator(request);
  const body = await readBody(request);
  const intent = String(body.intent ?? "");
  const reviewId = typeof body.reviewId === "string" ? body.reviewId : "";
  const note = readText(body.reason);
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
          note,
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
          note,
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
          note,
          ip,
        });
      });
      return { ok: true };
    }

    case "delete-review": {
      // The operator types the start of the review's id: unlike the rating,
      // which four rows in five share, it names this one row.
      if (body.confirmName !== reviewConfirmValue(r.id)) {
        return Response.json(
          { error: "Confirmation does not match" },
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

/** What the delete dialog asks the operator to type. Re-exported from the table. */
export { reviewConfirmValue };

export default function Reviews({ loaderData }: Route.ComponentProps) {
  const { data, filters, params, error } = loaderData;
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
              {
                id: "moderated",
                label: "Hidden or flagged",
                value: data.stats.moderated,
              },
            ]}
          />

          <FilterBar active={Boolean(filters.q || filters.statuses.length)}>
            <SearchField
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search review text..."
              label="Reviews"
            />
            <FilterSelect
              name="statuses"
              label="Status"
              defaultValue={filters.statuses[0] ?? ""}
              placeholder="All statuses"
              options={[
                { value: "visible", label: "Visible" },
                { value: "hidden", label: "Hidden" },
                { value: "flagged", label: "Flagged" },
              ]}
            />
          </FilterBar>

          <ReviewTable
            rows={data.page.rows}
            sort={params.sort}
            dir={params.dir}
          />

          <Pagination page={data.page} />
        </>
      )}
    </div>
  );
}
