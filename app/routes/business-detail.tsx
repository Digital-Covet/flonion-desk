import { useOutletContext } from "react-router";
import { BusinessDetail } from "../components/businesses/BusinessDetail";
import { PageHeader } from "../components/shell/PageHeader";
import { SectionError } from "../components/shell/SectionError";
import { clientIp, recordAudit } from "../prisma/audit";
import { loadBusinessDetail } from "../prisma/businesses";
import { db } from "../prisma/db";
import { readFailure } from "../prisma/loader-error";
import { requireOperator, requireOperatorRead } from "../prisma/operator";
import { toStamp } from "../prisma/time";
import type { Route } from "./+types/business-detail";
import type { ConsoleContext } from "./console";

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.business?.name;
  return [
    { title: name ? `Flonion Desk — ${name}` : "Flonion Desk — Business" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  requireOperatorRead(request);
  try {
    return { business: await loadBusinessDetail(params.id), error: null };
  } catch (cause) {
    return { business: null, error: readFailure("business detail", cause) };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const operator = requireOperator(request);
  const body = await request.json();
  const intent = body.intent as string;
  const businessId = body.businessId as string;
  const ip = clientIp(request);

  const b = await db.orm.public.Business.where((x) => x.id.eq(businessId))
    .select(
      "id",
      "name",
      "sector",
      "keywords",
      "description",
      "phone",
      "address",
      "rating",
      "qrScanCount",
    )
    .first();
  if (!b) {
    return Response.json({ error: "Business not found" }, { status: 404 });
  }

  const before = {
    name: b.name,
    sector: b.sector,
    keywords: b.keywords,
    description: b.description,
    phone: b.phone,
    address: b.address,
    rating: b.rating,
    qrScanCount: b.qrScanCount,
  };

  switch (intent) {
    case "edit-business": {
      const name = typeof body.name === "string" ? body.name.trim() : b.name;
      const sector =
        typeof body.sector === "string" ? body.sector.trim() || null : b.sector;
      const keywords =
        typeof body.keywords === "string"
          ? body.keywords.trim() || null
          : b.keywords;
      const description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : b.description;
      const phone =
        typeof body.phone === "string" ? body.phone.trim() || null : b.phone;
      const address =
        typeof body.address === "string"
          ? body.address.trim() || null
          : b.address;

      await db.transaction(async (tx) => {
        await tx.orm.public.Business.where((x) => x.id.eq(businessId)).update({
          name,
          sector,
          keywords,
          description,
          phone,
          address,
          updatedAt: toStamp(Date.now()),
        });
        await recordAudit(tx, operator, {
          action: "business.edit",
          entity: "business",
          entityId: businessId,
          before,
          after: { name, sector, keywords, description, phone, address },
          ip,
        });
      });

      return { ok: true };
    }

    case "clear-rating-cache": {
      await db.transaction(async (tx) => {
        await tx.orm.public.Business.where((x) => x.id.eq(businessId)).update({
          rating: null,
          reviewCount: null,
          ratingUpdatedAt: null,
          updatedAt: toStamp(Date.now()),
        });
        await recordAudit(tx, operator, {
          action: "business.clear_rating_cache",
          entity: "business",
          entityId: businessId,
          before: { rating: b.rating },
          after: { rating: null },
          note: "Cleared cached Google rating",
          ip,
        });
      });

      return { ok: true };
    }

    case "reset-qr-counter": {
      await db.transaction(async (tx) => {
        await tx.orm.public.Business.where((x) => x.id.eq(businessId)).update({
          qrScanCount: 0,
          updatedAt: toStamp(Date.now()),
        });
        await recordAudit(tx, operator, {
          action: "business.reset_qr",
          entity: "business",
          entityId: businessId,
          before: { qrScanCount: b.qrScanCount },
          after: { qrScanCount: 0 },
          ip,
        });
      });

      return { ok: true };
    }

    case "delete-business": {
      const name = body.confirmName as string;
      if (name !== b.name) {
        return Response.json({ error: "Name does not match" }, { status: 400 });
      }

      await db.transaction(async (tx) => {
        await tx.orm.public.Business.where((x) => x.id.eq(businessId)).delete();
        await recordAudit(tx, operator, {
          action: "business.delete",
          entity: "business",
          entityId: businessId,
          before,
          note: `Deleted business "${b.name}"`,
          ip,
        });
      });

      return { ok: true, redirect: "/businesses" };
    }

    default:
      return Response.json(
        { error: `Unknown intent: ${intent}` },
        { status: 400 },
      );
  }
}

export default function BusinessDetailRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { business, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  // A missing row and a failed read are different states and read differently:
  // one means the id is wrong, the other means the database is unreachable.
  const notFound = business === null && error === null;

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader
        title={business?.name ?? "Business"}
        trail={[
          { label: "Businesses", to: "/businesses" },
          { label: business?.name ?? params.id },
        ]}
        operator={operator}
      />

      {business ? (
        <BusinessDetail business={business} />
      ) : (
        <SectionError
          title={notFound ? "Business not found" : "Business unavailable"}
          detail={
            notFound
              ? `No business has the id ${params.id}.`
              : "The platform database could not be read."
          }
          error={error}
        />
      )}
    </div>
  );
}
