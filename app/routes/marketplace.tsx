import { useOutletContext } from "react-router";
import { businessActionItems } from "../components/businesses/businessActions";
import { ActionMenu } from "../components/shell/ActionMenu";
import { PageHeader } from "../components/shell/PageHeader";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { StatusBadge } from "../components/shell/StatusBadge";
import { readFailure } from "../prisma/loader-error";
import type { ListingModeration } from "../prisma/marketplace";
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
 */
function ListingActions({
  b,
}: {
  b: ListingModeration & { id: string; name: string };
}) {
  return (
    <ActionMenu
      label={`Actions for ${b.name}`}
      items={businessActionItems(b)}
    />
  );
}

function ListingBadges({ b }: { b: ListingModeration }) {
  return (
    <span className="inline-flex gap-1">
      {b.status === "suspended" ? (
        <StatusBadge tone="bad">Suspended</StatusBadge>
      ) : null}
      {b.marketplaceHidden ? (
        <StatusBadge tone="neutral">Unlisted</StatusBadge>
      ) : null}
    </span>
  );
}

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
          <section className="mt-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-1">
              Hidden and suspended listings
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Not shown in partner search. Changes can take up to a minute to
              reach the tenant app, which caches search results.
            </p>
            {data.moderated.length === 0 ? (
              <p className="text-sm text-gray-500">Every business is listed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Business</th>
                      <th className="pb-2 font-medium">State</th>
                      <th className="pb-2 font-medium">Reason</th>
                      <th className="pb-2 font-medium">Changed</th>
                      <th className="pb-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.moderated.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100">
                        <td className="py-2">
                          <a
                            href={`/businesses/${b.id}`}
                            className="text-teal-600 hover:underline"
                          >
                            {b.name}
                          </a>
                          {b.username ? (
                            <span className="ml-1 text-gray-400">
                              @{b.username}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2">
                          <ListingBadges b={b} />
                        </td>
                        <td className="py-2 text-gray-600 max-w-[260px] truncate">
                          {b.suspendReason ?? "—"}
                        </td>
                        <td className="py-2 text-gray-600">{b.updated}</td>
                        <td className="py-2 text-right">
                          <ListingActions b={b} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Category Distribution */}
          <section className="mt-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">
              Category Distribution
            </h2>
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
          <section className="mt-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">
              Favourites Leaderboard
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({data.orphanedFavourites} orphaned)
              </span>
            </h2>
            {data.favourites.length === 0 ? (
              <p className="text-sm text-gray-500">No favourites yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Business</th>
                      <th className="pb-2 font-medium">Favourited by</th>
                      <th className="pb-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.favourites.map((f, i) => (
                      <tr key={f.id} className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 font-medium">
                          <a
                            href={`/businesses/${f.id}`}
                            className="text-teal-600 hover:underline mr-2"
                          >
                            {f.name}
                          </a>
                          <ListingBadges b={f} />
                        </td>
                        <td className="py-2">{f.favouriteCount}</td>
                        <td className="py-2 text-right">
                          <ListingActions b={f} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* New Arrivals */}
          <section className="mt-6 rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">
              New Arrivals (30 days)
            </h2>
            {data.newArrivals.length === 0 ? (
              <p className="text-sm text-gray-500">No new businesses.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Owner</th>
                      <th className="pb-2 font-medium">Created</th>
                      <th className="pb-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.newArrivals.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100">
                        <td className="py-2">
                          <a
                            href={`/businesses/${b.id}`}
                            className="text-teal-600 hover:underline"
                          >
                            {b.name}
                          </a>
                          <span className="ml-2">
                            <ListingBadges b={b} />
                          </span>
                        </td>
                        <td className="py-2 text-gray-600">
                          {b.category ?? "Uncategorised"}
                        </td>
                        <td className="py-2">{b.ownerName}</td>
                        <td className="py-2 text-gray-600">{b.created}</td>
                        <td className="py-2 text-right">
                          <ListingActions b={b} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
