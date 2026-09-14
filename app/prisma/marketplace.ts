import { matchBusinessToCategory } from "../components/data/categories";
import { db } from "./db";
import { daysAgo, formatDate } from "./time";

/**
 * Marketplace section — a view of businesses through the partner lens.
 *
 * This is read-only; no marketplace entities exist in the schema. The section
 * surfaces category distribution, partner-readiness, favourites, new arrivals,
 * and ranking previews.
 */

export interface CategoryDistribution {
  category: string;
  count: number;
}

export interface PartnerReadinessRow {
  id: string;
  name: string;
  username: string | null;
  logo: string | null;
  sector: string | null;
  keywords: string | null;
  serviceCount: number;
  projectCount: number;
  contactCount: number;
  slotCount: number;
  /** Simple completeness score: fields present / total expected fields. */
  completeness: number;
}

export interface FavouriteRow {
  id: string;
  name: string;
  logo: string | null;
  favouriteCount: number;
}

export interface NewArrivalRow {
  id: string;
  name: string;
  username: string | null;
  logo: string | null;
  sector: string | null;
  category: string | null;
  ownerName: string;
  created: string;
}

export interface MarketplaceData {
  categoryDistribution: CategoryDistribution[];
  partnerReadiness: PartnerReadinessRow[];
  favourites: FavouriteRow[];
  orphanedFavourites: number;
  newArrivals: NewArrivalRow[];
  stats: {
    totalBusinesses: number;
    withUsername: number;
    avgCompleteness: number;
  };
}

const NEW_ARRIVAL_DAYS = 30;
const PARTNER_READINESS_LIMIT = 20;
const FAVOURITES_LIMIT = 10;

export async function loadMarketplace(): Promise<MarketplaceData> {
  const all = db.orm.public.Business;

  // Categories are matched in JS, so the plain business columns are read in
  // full. The per-business relation counts are not: they are only needed for
  // the rows actually returned, and are fetched for those below. Favourites are
  // counted in the database rather than one row per favourite.
  const [businesses, favouriteGroups, newArrivals] = await Promise.all([
    all
      .select(
        "id",
        "name",
        "username",
        "logo",
        "sector",
        "keywords",
        "description",
      )
      .all(),

    db.orm.public.FavoritePartner.groupBy("businessId").aggregate((a) => ({
      n: a.count(),
    })),

    all
      .where((b) => b.createdAt.gte(daysAgo(NEW_ARRIVAL_DAYS)))
      .select(
        "id",
        "name",
        "username",
        "logo",
        "sector",
        "keywords",
        "createdAt",
      )
      .include("user", (u) => u.select("name"))
      .orderBy((b) => b.createdAt.desc())
      .limit(10)
      .all(),
  ]);

  const byId = new Map(businesses.map((b) => [b.id, b]));

  // Category distribution
  const catMap = new Map<string, number>();
  for (const b of businesses) {
    const cat =
      matchBusinessToCategory(b.sector, b.keywords) ?? "Uncategorised";
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }
  const categoryDistribution: CategoryDistribution[] = [...catMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Favourites leaderboard. A favourite whose business is not in the list is
  // orphaned.
  const favouriteRows: FavouriteRow[] = [];
  let orphanedFavourites = 0;
  for (const group of favouriteGroups) {
    const b = byId.get(group.businessId);
    if (!b) {
      orphanedFavourites += group.n;
      continue;
    }
    favouriteRows.push({
      id: b.id,
      name: b.name,
      logo: b.logo,
      favouriteCount: group.n,
    });
  }
  const favouritesLeaderboard = favouriteRows
    .sort((a, b) => b.favouriteCount - a.favouriteCount)
    .slice(0, FAVOURITES_LIMIT);

  // Partner readiness: score every business, then count relations for the top
  // rows only.
  const scored = businesses
    .map((b) => {
      const fieldsPresent = [
        b.username,
        b.logo,
        b.sector,
        b.keywords,
        b.description,
      ].filter(Boolean).length;
      return {
        business: b,
        completeness: Math.round((fieldsPresent / 5) * 100),
      };
    })
    .sort((a, b) => b.completeness - a.completeness);

  const topIds = scored
    .slice(0, PARTNER_READINESS_LIMIT)
    .map((s) => s.business.id);
  const counts =
    topIds.length === 0
      ? []
      : await all
          .where((b) => b.id.in(topIds))
          .select("id")
          .include("services", (s) => s.count())
          .include("projects", (p) => p.count())
          .include("businessContacts", (c) => c.count())
          .include("availabilitySlots", (s) => s.count())
          .all();
  const countsById = new Map(counts.map((c) => [c.id, c]));

  const partnerReadiness: PartnerReadinessRow[] = scored
    .slice(0, PARTNER_READINESS_LIMIT)
    .map(({ business: b, completeness }) => {
      const c = countsById.get(b.id);
      return {
        id: b.id,
        name: b.name,
        username: b.username,
        logo: b.logo,
        sector: b.sector,
        keywords: b.keywords,
        serviceCount: c?.services ?? 0,
        projectCount: c?.projects ?? 0,
        contactCount: c?.businessContacts ?? 0,
        slotCount: c?.availabilitySlots ?? 0,
        completeness,
      };
    });

  // Stats
  const withUsername = businesses.filter((b) => b.username).length;
  const avgCompleteness =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, s) => sum + s.completeness, 0) / scored.length,
        )
      : 0;

  // New arrivals
  const newArrivalRows: NewArrivalRow[] = newArrivals.map((b) => ({
    id: b.id,
    name: b.name,
    username: b.username,
    logo: b.logo,
    sector: b.sector,
    category: matchBusinessToCategory(b.sector, b.keywords),
    ownerName: b.user?.name ?? "Unknown",
    created: formatDate(b.createdAt),
  }));

  return {
    categoryDistribution,
    partnerReadiness,
    favourites: favouritesLeaderboard,
    orphanedFavourites,
    newArrivals: newArrivalRows,
    stats: {
      totalBusinesses: businesses.length,
      withUsername,
      avgCompleteness,
    },
  };
}
