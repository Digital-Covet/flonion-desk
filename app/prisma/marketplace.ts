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

export async function loadMarketplace(): Promise<MarketplaceData> {
  const all = db.orm.public.Business;

  const [businesses, favourites, orphaned, newArrivals] = await Promise.all([
    all
      .select(
        "id",
        "name",
        "username",
        "logo",
        "sector",
        "keywords",
        "description",
        "createdAt",
      )
      .include("services", (s) => s.count())
      .include("projects", (p) => p.count())
      .include("businessContacts", (c) => c.count())
      .include("availabilitySlots", (s) => s.count())
      .all(),

    db.orm.public.FavoritePartner.select("businessId")
      .include("business", (b) => b.select("id", "name", "logo"))
      .all(),

    // Orphaned favourites: favourites whose business no longer exists.
    // We count them by checking favourites with no matching business.
    db.orm.public.FavoritePartner.aggregate((a) => ({ n: a.count() })),

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

  // Favourites leaderboard
  const favMap = new Map<
    string,
    { name: string; logo: string | null; count: number }
  >();
  for (const f of favourites) {
    const b = f.business;
    if (!b) continue;
    const existing = favMap.get(b.id);
    if (existing) {
      existing.count++;
    } else {
      favMap.set(b.id, { name: b.name, logo: b.logo, count: 1 });
    }
  }
  const favouritesLeaderboard: FavouriteRow[] = [...favMap.entries()]
    .map(([id, data]) => ({
      id,
      name: data.name,
      logo: data.logo,
      favouriteCount: data.count,
    }))
    .sort((a, b) => b.favouriteCount - a.favouriteCount)
    .slice(0, 10);

  // Partner readiness
  const partnerReadiness: PartnerReadinessRow[] = businesses.map((b) => {
    const fieldsPresent = [
      b.username,
      b.logo,
      b.sector,
      b.keywords,
      b.description,
    ].filter(Boolean).length;
    const completeness = Math.round((fieldsPresent / 5) * 100);

    return {
      id: b.id,
      name: b.name,
      username: b.username,
      logo: b.logo,
      sector: b.sector,
      keywords: b.keywords,
      serviceCount: b.services,
      projectCount: b.projects,
      contactCount: b.businessContacts,
      slotCount: b.availabilitySlots,
      completeness,
    };
  });
  partnerReadiness.sort((a, b) => b.completeness - a.completeness);

  // Stats
  const withUsername = businesses.filter((b) => b.username).length;
  const avgCompleteness =
    partnerReadiness.length > 0
      ? Math.round(
          partnerReadiness.reduce((sum, r) => sum + r.completeness, 0) /
            partnerReadiness.length,
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
    partnerReadiness: partnerReadiness.slice(0, 20),
    favourites: favouritesLeaderboard,
    orphanedFavourites: Math.max(0, orphaned.n - favourites.length),
    newArrivals: newArrivalRows,
    stats: {
      totalBusinesses: businesses.length,
      withUsername,
      avgCompleteness,
    },
  };
}
