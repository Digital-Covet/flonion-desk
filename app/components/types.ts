import type { ComponentType } from "react";

/**
 * The subset of props every icon in this app understands — the intersection
 * of what `lucide-react` accepts and what the local SVGs need. Keeping one
 * shape lets data modules hold *components* instead of ready-made JSX.
 */
export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};

export type IconComponent = ComponentType<IconProps>;

/**
 * Presentation half of a stat tile. The figure it displays is not here: it
 * arrives from the loader and is matched to this by `id`, so the tile's look
 * and the number it reports stay independent.
 */
export interface StatTile {
  id: string;
  label: string;
  iconBg: string;
  icon: IconComponent;
  iconProps?: IconProps;
}

/** Loader half of a stat tile. */
export interface StatFigure {
  value: number;
  /** Delta against the previous window; absent when there is nothing to compare. */
  change?: string;
  positive: boolean;
}

/** One figure in the platform health panel. */
export interface HealthMetric {
  id: string;
  label: string;
  value: number;
}

/** One weekly bucket in either chart. */
export interface ChartPoint {
  label: string;
  value: number;
}

/** A row in the recent-businesses table. */
export interface BusinessRow {
  id: string;
  name: string;
  sector: string | null;
  rating: number | null;
  reviewCount: number | null;
  /** Owner's onboarding state — the column lives on User, not Business. */
  onboardingCompleted: boolean;
}

/** The three sources merged into the activity feed. */
export type ActivityKind = "join" | "invite" | "feedback";

/** An entry in the platform activity feed. */
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  /** Pre-formatted on the server, so the two renders cannot disagree. */
  date: string;
}

/** How one activity kind is drawn; the copy itself comes from the loader. */
export interface ActivityStyle {
  iconBg: string;
  icon: IconComponent;
  iconProps?: IconProps;
}

/** Everything the overview route loads in one request. */
export interface OverviewData {
  stats: Record<string, StatFigure>;
  health: HealthMetric[];
  signups: ChartPoint[];
  reviews: ChartPoint[];
  recentBusinesses: BusinessRow[];
  activity: ActivityItem[];
}

/** A link in either sidebar nav group. */
export interface NavLink {
  id: string;
  label: string;
  icon: IconComponent;
  /**
   * Where the row goes. Absent means the section is not built yet: the row
   * still renders and still takes focus, it just does not navigate. That is
   * why active state is derived from the current location rather than stored
   * here — a hard-coded flag would have to be kept in sync by hand.
   */
  to?: string;
  /**
   * Treat descendant paths as this section too, so a detail page like
   * /businesses/:id keeps Businesses lit rather than lighting nothing.
   */
  nested?: boolean;
}

/** A link in the dashboard footer. */
export interface FooterLink {
  label: string;
  href: string;
}

/** Distinct sector with how many businesses carry it. */
export interface SectorFacet {
  sector: string;
  count: number;
}

/** A person attached to a business, on the detail page. */
export interface BusinessPerson {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  /** Only meaningful for the owner; null for members, whose state is not read. */
  onboardingCompleted: boolean | null;
}

/** A row in the Businesses table. */
export interface BusinessListRow {
  id: string;
  name: string;
  username: string | null;
  logo: string | null;
  sector: string | null;
  /** Derived from sector and keywords at read time; there is no column. */
  category: string | null;
  /** Cached from Google Business Profile, with no freshness stamp. */
  rating: number | null;
  reviewCount: number | null;
  qrScanCount: number;
  /** Whether a Google place has been claimed. */
  claimed: boolean;
  teamSize: number;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerOnboarded: boolean;
  /** Pre-formatted on the server, so the two renders cannot disagree. */
  created: string;
}

/** The booking and working window a business advertises. */
export interface BusinessSchedule {
  workingDays: string;
  workingStartTime: string;
  workingEndTime: string;
  bookingStartTime: string;
  bookingEndTime: string;
  slotDuration: number;
  timezone: string;
}

/** One child-relation tally on the detail page. */
export interface RelationCount {
  id: string;
  label: string;
  value: number;
}

/** Everything the business detail page renders. */
export interface BusinessDetailData {
  id: string;
  name: string;
  username: string | null;
  logo: string | null;
  phone: string | null;
  address: string | null;
  sector: string | null;
  keywords: string | null;
  description: string | null;
  category: string | null;
  placeId: string | null;
  reviewLink: string | null;
  rating: number | null;
  reviewCount: number | null;
  qrScanCount: number;
  created: string;
  updated: string;
  schedule: BusinessSchedule;
  owner: BusinessPerson;
  members: BusinessPerson[];
  counts: RelationCount[];
}
