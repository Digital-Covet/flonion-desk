import { matchBusinessToCategory } from "../components/data/categories";
import { db } from "./db";
import { daysAgo, formatDate } from "./time";

/**
 * Marketplace section — a view of businesses through the partner lens.
 *
 * This is read-only; no marketplace entities exist in the schema. The section
 * surfaces category distribution, partner-readiness, favourites, new arrivals,
 * and ranking previews.
 *
 * No read here walks the business table row by row: totals are aggregated in
 * the database and every row fetch is capped, so the cost of a visit does not
 * grow with the number of businesses.
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
  /**
   * The most complete businesses among the `READINESS_CANDIDATE_LIMIT` most
   * recently updated, not across the whole table.
   */
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

/**
 * Businesses scored for partner readiness.
 *
 * Completeness is a score computed in JS, and the ORM cannot order rows by it,
 * so ranking every business would mean reading the whole table on each visit.
 * The most recently updated rows are the ones an operator can act on, and a
 * fixed cap keeps the cost flat as the table grows.
 */
const READINESS_CANDIDATE_LIMIT = 500;

export async function loadMarketplace(): Promise<MarketplaceData> {
  const all = db.orm.public.Business;

  const [
    total,
    withUsername,
    withLogo,
    withSector,
    withKeywords,
    withDescription,
    categoryGroups,
    favouriteGroups,
    candidates,
    newArrivals,
  ] = await Promise.all([
    all.aggregate((a) => ({ n: a.count() })),

    // A field counts toward completeness when it is set and not blank, the same
    // truthiness test the per-row readiness score applies below.
    all
      .where((b) => b.username.isNotNull())
      .where((b) => b.username.neq(""))
      .aggregate((a) => ({ n: a.count() })),
    all
      .where((b) => b.logo.isNotNull())
      .where((b) => b.logo.neq(""))
      .aggregate((a) => ({ n: a.count() })),
    all
      .where((b) => b.sector.isNotNull())
      .where((b) => b.sector.neq(""))
      .aggregate((a) => ({ n: a.count() })),
    all
      .where((b) => b.keywords.isNotNull())
      .where((b) => b.keywords.neq(""))
      .aggregate((a) => ({ n: a.count() })),
    all
      .where((b) => b.description.isNotNull())
      .where((b) => b.description.neq(""))
      .aggregate((a) => ({ n: a.count() })),

    // Categories are matched in JS from sector and keywords, so the database
    // returns one row per distinct pair with its count, not one per business.
    all.groupBy("sector", "keywords").aggregate((a) => ({ n: a.count() })),

    db.orm.public.FavoritePartner.groupBy("businessId").aggregate((a) => ({
      n: a.count(),
    })),

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
      .orderBy((b) => b.updatedAt.desc())
      .limit(READINESS_CANDIDATE_LIMIT)
      .all(),

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
  for (const group of categoryGroups) {
    const cat =
      matchBusinessToCategory(group.sector, group.keywords) ?? "Uncategorised";
    catMap.set(cat, (catMap.get(cat) ?? 0) + group.n);
  }
  const categoryDistribution: CategoryDistribution[] = [...catMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Grouped rows cannot be ordered by their count through the ORM, so the
  // favourite groups (one id and one number each) are ranked here and only the
  // leaders' businesses are fetched.
  const leaders = [...favouriteGroups]
    .sort((a, b) => b.n - a.n)
    .slice(0, FAVOURITES_LIMIT);
  const leaderIds = leaders.map((g) => g.businessId);

  // Partner readiness: score the candidates, then count relations for the top
  // rows only.
  const scored = candidates
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
    .sort((a, b) => b.completeness - a.completeness)
    .slice(0, PARTNER_READINESS_LIMIT);
  const topIds = scored.map((s) => s.business.id);

  const [leaderRows, counts] = await Promise.all([
    leaderIds.length === 0
      ? []
      : all
          .where((b) => b.id.in(leaderIds))
          .select("id", "name", "logo")
          .all(),
    topIds.length === 0
      ? []
      : all
          .where((b) => b.id.in(topIds))
          .select("id")
          .include("services", (s) => s.count())
          .include("projects", (p) => p.count())
          .include("businessContacts", (c) => c.count())
          .include("availabilitySlots", (s) => s.count())
          .all(),
  ]);

  // A leader whose business row is gone is orphaned. The foreign key cascades
  // business deletes, so this should stay zero; the count exists to make it
  // visible if that ever stops holding.
  const leaderById = new Map(leaderRows.map((b) => [b.id, b]));
  const favourites: FavouriteRow[] = [];
  let orphanedFavourites = 0;
  for (const group of leaders) {
    const b = leaderById.get(group.businessId);
    if (!b) {
      orphanedFavourites += group.n;
      continue;
    }
    favourites.push({
      id: b.id,
      name: b.name,
      logo: b.logo,
      favouriteCount: group.n,
    });
  }

  const countsById = new Map(counts.map((c) => [c.id, c]));
  const partnerReadiness: PartnerReadinessRow[] = scored.map(
    ({ business: b, completeness }) => {
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
    },
  );

  // Stats. Averaging each business's (present / 5) equals total present fields
  // over five per business, so the average needs only the per-field counts.
  const fieldsPresent =
    withUsername.n +
    withLogo.n +
    withSector.n +
    withKeywords.n +
    withDescription.n;
  const avgCompleteness =
    total.n > 0 ? Math.round((fieldsPresent / (total.n * 5)) * 100) : 0;

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
    favourites,
    orphanedFavourites,
    newArrivals: newArrivalRows,
    stats: {
      totalBusinesses: total.n,
      withUsername: withUsername.n,
      avgCompleteness,
    },
  };
}
