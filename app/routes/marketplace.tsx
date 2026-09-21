import { useOutletContext } from "react-router";
import { CARD, TEXT_CARD_TITLE, TEXT_MUTED } from "../components/constants";
import {
  FavouritesTable,
  ModeratedTable,
  NewArrivalsTable,
} from "../components/marketplace/MarketplaceTables";
import { PageHeader } from "../components/shell/PageHeader";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { readFailure } from "../prisma/loader-error";
import { loadMarketplace } from "../prisma/marketplace";
import { requireOperatorRead } from "../prisma/operator";
import type { Route } from "./+types/marketplace";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Marketplace" },
    {
      name: "description",
      content: "Businesses through the partner lens.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireOperatorRead(request);
  try {
    return { data: await loadMarketplace(), error: null };
  } catch (cause) {
    return { data: null, error: readFailure("marketplace", cause) };
  }
}

/**
 * Row actions post to `/businesses`, which owns business moderation, so this
 * route needs no action of its own; the submission revalidates this page too.
 * The menus live in the MarketplaceTables components.
 */

export default function Marketplace({ loaderData }: Route.ComponentProps) {
  const { data, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="Marketplace" operator={operator} />

      {data === null ? (
        <SectionError
          title="Marketplace unavailable"
          detail="The platform database could not be read."
          error={error}
        />
      ) : (
        <>
          <StatRow
            items={[
              {
                id: "total",
                label: "Businesses",
                value: data.stats.totalBusinesses,
              },
              {
                id: "username",
                label: "With username",
                value: data.stats.withUsername,
              },
              {
                id: "completeness",
                label: "Avg completeness",
                value: data.stats.avgCompleteness,
              },
              { id: "listed", label: "Listed", value: data.stats.listed },
              { id: "hidden", label: "Hidden", value: data.stats.hidden },
              {
                id: "suspended",
                label: "Suspended",
                value: data.stats.suspended,
              },
            ]}
          />

          {/* Moderated listings */}
          <section className={`mt-6 ${CARD} p-6`}>
            <h2 className={`${TEXT_CARD_TITLE} mb-1`}>
              Hidden and suspended listings
            </h2>
            <p className={`${TEXT_MUTED} mb-4`}>
              Not shown in partner search. Changes can take up to a minute to
              reach the tenant app, which caches search results.
            </p>
            {data.moderated.length === 0 ? (
              <p className={TEXT_MUTED}>Every business is listed.</p>
            ) : (
              <ModeratedTable rows={data.moderated} />
            )}
          </section>

          {/* Category Distribution */}
          <section className={`mt-6 ${CARD} p-6`}>
            <h2 className={`${TEXT_CARD_TITLE} mb-4`}>Category Distribution</h2>
            <div className="space-y-2">
              {data.categoryDistribution.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-sm w-40 truncate">{cat.category}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4">
                    <div
                      className="bg-teal-500 rounded-full h-4 transition-all"
                      style={{
                        width: `${Math.max(4, (cat.count / data.stats.totalBusinesses) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-10 text-right">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Favourites Leaderboard */}
          <section className={`mt-6 ${CARD} p-6`}>
            <h2 className={`${TEXT_CARD_TITLE} mb-4`}>
              Favourites Leaderboard
              <span className={`${TEXT_MUTED} ml-2`}>
                ({data.orphanedFavourites} orphaned)
              </span>
            </h2>
            {data.favourites.length === 0 ? (
              <p className={TEXT_MUTED}>No favourites yet.</p>
            ) : (
              <FavouritesTable rows={data.favourites} />
            )}
          </section>

          {/* New Arrivals */}
          <section className={`mt-6 ${CARD} p-6`}>
            <h2 className={`${TEXT_CARD_TITLE} mb-4`}>
              New Arrivals (30 days)
            </h2>
            {data.newArrivals.length === 0 ? (
              <p className={TEXT_MUTED}>No new businesses.</p>
            ) : (
              <NewArrivalsTable rows={data.newArrivals} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
