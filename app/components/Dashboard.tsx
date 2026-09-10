import { TriangleAlert } from "lucide-react";
import {
  CARD,
  COLORS,
  FONT_BOLD,
  TEXT_CARD_TITLE,
  TEXT_MUTED,
} from "./constants";
import { ActivityFeed } from "./dashboard/ActivityFeed";
import { PlatformHealthCard } from "./dashboard/PlatformHealthCard";
import { RecentBusinessesTable } from "./dashboard/RecentBusinessesTable";
import { ReviewsChart } from "./dashboard/ReviewsChart";
import { ShortcutsCard } from "./dashboard/ShortcutsCard";
import { SignupsChart } from "./dashboard/SignupsChart";
import { StatCard } from "./dashboard/StatCard";
import { mainNavLinks } from "./data/navLinks";
import { statTiles } from "./data/statTiles";
import { PageHeader } from "./shell/PageHeader";
import type { OverviewData } from "./types";

type DashboardProps = {
  data: OverviewData | null;
  /** Set when the loader's queries failed; `data` is null in that case. */
  error: string | null;
  /** Operator label from the shell, or null when no token was presented. */
  operator: string | null;
};

/**
 * The panel renders one of two things: the overview, or an explicit notice
 * that the read failed. There is no third path where a figure is invented to
 * keep the layout intact.
 */
export default function Dashboard({ data, error, operator }: DashboardProps) {
  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="Overview" operator={operator} showSearch />

      {data === null ? (
        <div className={`${CARD} p-6 mb-6 flex items-start gap-3`}>
          <TriangleAlert size={20} color={COLORS.red} className="flex-none" />
          <div>
            <p className={TEXT_CARD_TITLE}>Overview unavailable</p>
            <p className={TEXT_MUTED}>
              The platform database could not be read, so no figures are shown.
            </p>
            {error ? (
              <p className={`${TEXT_MUTED} mt-1 ${FONT_BOLD}`}>{error}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          {/* Stat tiles: presentation config joined to its loader figure by id */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {statTiles.map((tile) => {
              const figure = data.stats[tile.id];
              return figure ? (
                <StatCard key={tile.id} {...tile} {...figure} />
              ) : null;
            })}
          </div>

          {/* Info cards */}
          <div className="flex gap-4 mb-6 min-h-[200px]">
            <PlatformHealthCard metrics={data.health} />
            <ShortcutsCard sections={mainNavLinks} />
          </div>

          {/* Charts */}
          <div className="flex gap-4 mb-6">
            <SignupsChart series={data.signups} />
            <ReviewsChart series={data.reviews} />
          </div>

          {/* Businesses + activity */}
          <div className="flex gap-4 mb-6">
            <RecentBusinessesTable rows={data.recentBusinesses} />
            <ActivityFeed items={data.activity} />
          </div>
        </>
      )}
    </div>
  );
}
