import {
  CARD,
  COLORS,
  TEXT_BODY_BOLD,
  TEXT_CARD_TITLE,
  TEXT_MUTED,
  TEXT_MUTED_SM,
} from "../constants";
import { activityStyles } from "../data/orders";
import type { ActivityItem } from "../types";

/**
 * Join requests, invitations and feedback merged into one reverse-chronological
 * timeline. The loader does the merging; the styling per source is looked up
 * from the row's `kind`.
 */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className={`${CARD} p-5 flex-none`} style={{ width: 320 }}>
      <p className={`${TEXT_CARD_TITLE} mb-0.5`}>Platform activity</p>
      <p className={`${TEXT_MUTED} mb-4`}>Newest first</p>

      {items.length === 0 ? (
        <p className={TEXT_MUTED}>Nothing recorded yet.</p>
      ) : (
        <div className="flex flex-col">
          {items.map(({ id, kind, title, date }, index) => {
            const isLast = index === items.length - 1;
            const { iconBg, icon: Icon, iconProps } = activityStyles[kind];
            return (
              <div key={id} className="flex gap-3">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className="size-[34px] rounded-full flex items-center justify-center flex-none"
                    style={{ backgroundColor: iconBg }}
                  >
                    <Icon {...iconProps} />
                  </div>
                  {!isLast && (
                    <div
                      className="w-0.5 flex-1 my-1"
                      style={{ backgroundColor: COLORS.border, minHeight: 20 }}
                    />
                  )}
                </div>
                {/* Content */}
                <div className="pb-4 min-w-0">
                  <p className={TEXT_BODY_BOLD}>{title}</p>
                  <p className={TEXT_MUTED_SM}>{date}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
