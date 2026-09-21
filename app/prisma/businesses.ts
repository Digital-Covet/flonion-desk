import { or } from "@prisma/orm-postgres/orm-client";
import type {
  BusinessFilters,
  BusinessSort,
} from "../components/data/businessFilters";
import { matchBusinessToCategory } from "../components/data/categories";
import type {
  BusinessDetailData,
  BusinessListRow,
  SectorFacet,
} from "../components/types";
import { db } from "./db";
import {
  likeTerm,
  type PageParams,
  type PageResult,
  pageResult,
} from "./paging";
import { daysAgo, formatDate } from "./time";

/**
 * Every read behind the Businesses section.
 *
 * Server-only, like every module in this directory: `db` is imported here and
 * in the route loader, never in a component.
 *
 * Filtering, counting and ordering all happen in Postgres. The alternative,
 * fetching rows and narrowing them in JS, cannot produce an honest total for
 * the pager, and a cross-tenant table is exactly where that matters.
 */

/**
 * Apply the filters to a Business collection.
 *
 * Returned rather than run, so the same predicate set feeds both the page of
 * rows and the total count. Building the chain twice is how a pager ends up
 * disagreeing with its own table.
 */
function filtered(f: BusinessFilters) {
  let c = db.orm.public.Business.where((b) => b.id.isNotNull());

  const term = likeTerm(f.q);
  if (term) {
    // Hits the business name/description/keywords/address trigram indexes.
    c = c.where((b) =>
      or(
        b.name.ilike(term),
        b.description.ilike(term),
        b.keywords.ilike(term),
        b.address.ilike(term),
      ),
    );
  }

  if (f.sectors.length > 0) {
    const sectors = f.sectors;
    c = c.where((b) => b.sector.in(sectors));
  }

  if (f.minRating !== null) {
    const min = f.minRating;
    c = c.where((b) => b.rating.gte(min));
  }

  if (f.hasRating === "yes") c = c.where((b) => b.rating.isNotNull());
  if (f.hasRating === "no") c = c.where((b) => b.rating.isNull());

  if (f.claimed === "yes") c = c.where((b) => b.placeId.isNotNull());
  if (f.claimed === "no") c = c.where((b) => b.placeId.isNull());

  if (f.moderation === "suspended")
    c = c.where((b) => b.status.eq("suspended"));
  if (f.moderation === "hidden")
    c = c.where((b) => b.marketplaceHidden.eq(true));
  if (f.moderation === "active") {
    c = c
      .where((b) => b.status.eq("active"))
      .where((b) => b.marketplaceHidden.eq(false));
  }

  if (f.createdWithinDays !== null) {
    const cutoff = daysAgo(f.createdWithinDays);
    c = c.where((b) => b.createdAt.gte(cutoff));
  }

  return c;
}

/** Headline figures above the table. Platform-wide, not filter-dependent. */
export interface BusinessStats {
  total: number;
  newThisMonth: number;
  withGoogleRating: number;
  claimed: number;
}

export interface BusinessListData {
  page: PageResult<BusinessListRow>;
  stats: BusinessStats;
  /** Distinct sectors with counts, for the filter control. */
  sectors: SectorFacet[];
}

export async function loadBusinessList(
  filters: BusinessFilters,
  params: PageParams<BusinessSort>,
): Promise<BusinessListData> {
  const c = filtered(filters);
  const all = db.orm.public.Business;
  const monthAgo = daysAgo(30);

  const [
    rows,
    matching,
    total,
    newThisMonth,
    withGoogleRating,
    claimed,
    sectorGroups,
  ] = await Promise.all([
    c
      .select(
        "id",
        "name",
        "username",
        "logo",
        "sector",
        "keywords",
        "rating",
        "reviewCount",
        "qrScanCount",
        "placeId",
        "createdAt",
        "status",
        "suspendReason",
        "marketplaceHidden",
      )
      .include("user", (u) =>
        u.select("id", "name", "email", "onboardingCompleted", "banned"),
      )
      .include("users", (u) => u.count())
      .orderBy([
        (b) => {
          const field =
            params.sort === "name"
              ? b.name
              : params.sort === "rating"
                ? b.rating
                : params.sort === "reviewCount"
                  ? b.reviewCount
                  : params.sort === "qrScanCount"
                    ? b.qrScanCount
                    : b.createdAt;
          return params.dir === "asc" ? field.asc() : field.desc();
        },
        // Without a tiebreaker, rows sharing a sort value can appear on two
        // pages or on none: OFFSET has no stable order to page over.
        (b) => b.id.asc(),
      ])
      .offset(params.offset)
      .limit(params.size)
      .all(),

    c.aggregate((a) => ({ n: a.count() })),

    all.aggregate((a) => ({ n: a.count() })),
    all
      .where((b) => b.createdAt.gte(monthAgo))
      .aggregate((a) => ({ n: a.count() })),
    all.where((b) => b.rating.isNotNull()).aggregate((a) => ({ n: a.count() })),
    all
      .where((b) => b.placeId.isNotNull())
      .aggregate((a) => ({ n: a.count() })),

    all.groupBy("sector").aggregate((a) => ({ n: a.count() })),
  ]);

  const listRows: BusinessListRow[] = rows.map((b) => ({
    id: b.id,
    name: b.name,
    username: b.username,
    logo: b.logo,
    sector: b.sector,
    // Derived at read time, not stored. See app/components/data/categories.ts.
    category: matchBusinessToCategory(b.sector, b.keywords),
    rating: b.rating,
    reviewCount: b.reviewCount,
    qrScanCount: b.qrScanCount,
    claimed: b.placeId !== null,
    teamSize: b.users,
    ownerId: b.user?.id ?? "",
    ownerName: b.user?.name ?? "Unknown",
    ownerEmail: b.user?.email ?? "",
    ownerOnboarded: b.user?.onboardingCompleted ?? false,
    ownerBanned: b.user?.banned ?? false,
    status: b.status,
    suspendReason: b.suspendReason,
    marketplaceHidden: b.marketplaceHidden,
    created: formatDate(b.createdAt),
  }));

  const sectors: SectorFacet[] = sectorGroups
    .flatMap((g) =>
      g.sector === null ? [] : [{ sector: g.sector, count: g.n }],
    )
    .sort((a, b) => a.sector.localeCompare(b.sector));

  return {
    page: pageResult(listRows, matching.n, params),
    stats: {
      total: total.n,
      newThisMonth: newThisMonth.n,
      withGoogleRating: withGoogleRating.n,
      claimed: claimed.n,
    },
    sectors,
  };
}

/** Everything the detail page shows. `null` when the id matches nothing. */
export async function loadBusinessDetail(
  id: string,
): Promise<BusinessDetailData | null> {
  const b = await db.orm.public.Business.where((x) => x.id.eq(id))
    .include("user", (u) =>
      u.select(
        "id",
        "name",
        "email",
        "emailVerified",
        "onboardingCompleted",
        "twoFactorEnabled",
        "role",
        "banned",
      ),
    )
    .include("users", (u) =>
      u.select(
        "id",
        "name",
        "email",
        "role",
        "emailVerified",
        "twoFactorEnabled",
      ),
    )
    .include("services", (s) => s.count())
    .include("projects", (p) => p.count())
    .include("businessContacts", (x) => x.count())
    .include("tasks", (t) => t.count())
    .include("availabilitySlots", (s) => s.count())
    .include("meetingRequests", (m) => m.count())
    .include("teamMeetings", (m) => m.count())
    .include("invitations", (i) => i.count())
    .include("joinRequests", (j) => j.count())
    .include("favoritePartners", (f) => f.count())
    .first();

  if (!b) return null;

  return {
    id: b.id,
    name: b.name,
    username: b.username,
    logo: b.logo,
    phone: b.phone,
    address: b.address,
    sector: b.sector,
    keywords: b.keywords,
    description: b.description,
    category: matchBusinessToCategory(b.sector, b.keywords),
    placeId: b.placeId,
    reviewLink: b.reviewLink,
    rating: b.rating,
    reviewCount: b.reviewCount,
    qrScanCount: b.qrScanCount,
    moderation: {
      status: b.status,
      suspendReason: b.suspendReason,
      suspendedAt: b.suspendedAt ? formatDate(b.suspendedAt) : null,
      marketplaceHidden: b.marketplaceHidden,
      ownerBanned: b.user?.banned ?? false,
    },
    created: formatDate(b.createdAt),
    updated: formatDate(b.updatedAt),
    schedule: {
      workingDays: b.workingDays,
      workingStartTime: b.workingStartTime,
      workingEndTime: b.workingEndTime,
      bookingStartTime: b.bookingStartTime,
      bookingEndTime: b.bookingEndTime,
      slotDuration: b.slotDuration,
      timezone: b.timezone,
    },
    owner: b.user
      ? {
          id: b.user.id,
          name: b.user.name,
          email: b.user.email,
          role: b.user.role,
          emailVerified: b.user.emailVerified,
          twoFactorEnabled: b.user.twoFactorEnabled ?? false,
          onboardingCompleted: b.user.onboardingCompleted,
        }
      : {
          id: "",
          name: "Unknown",
          email: "",
          role: "owner",
          emailVerified: false,
          twoFactorEnabled: false,
          onboardingCompleted: null,
        },
    // The owner is also a member: an earlier tenant-app migration backfilled
    // owners into their own team. They are rendered in their own card above, so
    // listing them again here would read as two people.
    members: b.users
      .filter((u) => u.id !== b.user?.id)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        emailVerified: u.emailVerified,
        twoFactorEnabled: u.twoFactorEnabled ?? false,
        onboardingCompleted: null,
      })),
    counts: [
      { id: "services", label: "Services", value: b.services },
      { id: "projects", label: "Portfolio items", value: b.projects },
      { id: "contacts", label: "Contacts", value: b.businessContacts },
      { id: "tasks", label: "Tasks", value: b.tasks },
      { id: "slots", label: "Availability slots", value: b.availabilitySlots },
      { id: "meetings", label: "Meeting requests", value: b.meetingRequests },
      { id: "teamMeetings", label: "Team meetings", value: b.teamMeetings },
      { id: "invitations", label: "Invitations", value: b.invitations },
      { id: "joinRequests", label: "Join requests", value: b.joinRequests },
      { id: "favorites", label: "Favourited by", value: b.favoritePartners },
    ],
  };
}
