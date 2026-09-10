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
  active?: boolean;
}

/** A link in the dashboard footer. */
export interface FooterLink {
  label: string;
  href: string;
}
