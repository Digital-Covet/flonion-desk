import { useOutletContext } from "react-router";
import { BusinessDetail } from "../components/businesses/BusinessDetail";
import { PageHeader } from "../components/shell/PageHeader";
import { SectionError } from "../components/shell/SectionError";
import { loadBusinessDetail } from "../prisma/businesses";
import type { Route } from "./+types/business-detail";
import type { ConsoleContext } from "./console";

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.business?.name;
  return [
    { title: name ? `Flonion Desk — ${name}` : "Flonion Desk — Business" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  try {
    return { business: await loadBusinessDetail(params.id), error: null };
  } catch (cause) {
    console.error("business detail loader failed", cause);
    return {
      business: null,
      error: cause instanceof Error ? cause.message : "Unknown database error",
    };
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
