import {
  CARD,
  COLORS,
  FONT_BOLD,
  TEXT_CARD_TITLE,
  TEXT_MUTED_SM,
} from "../constants";
import type { StatFigure, StatTile } from "../types";

/**
 * A tile is its presentation config plus the figure the loader matched to it.
 *
 * The delta line renders only when the loader supplied one: a window with
 * nothing before it has no percentage, and showing a made-up one would be
 * worse than showing none.
 */
type StatCardProps = StatTile & StatFigure;

export function StatCard({
  label,
  value,
  change,
  positive,
  iconBg,
  icon: Icon,
  iconProps,
}: StatCardProps) {
  return (
    <div className={`${CARD} p-4 flex items-start justify-between`}>
      <div>
        <p className={`${TEXT_MUTED_SM} mb-1`}>{label}</p>
        {/* Fixed locale: the server and the browser must group digits alike. */}
        <p className={TEXT_CARD_TITLE}>{value.toLocaleString("en-US")}</p>
        {change ? (
          <p className={`${TEXT_MUTED_SM} mt-1`}>
            <span
              className={FONT_BOLD}
              style={{ color: positive ? COLORS.green : COLORS.red }}
            >
              {change}
            </span>
            {" Since last month"}
          </p>
        ) : null}
      </div>
      <div
        className="rounded-[12px] size-[45px] flex items-center justify-center flex-none"
        style={{ backgroundColor: iconBg }}
      >
        <Icon {...iconProps} />
      </div>
    </div>
  );
}
