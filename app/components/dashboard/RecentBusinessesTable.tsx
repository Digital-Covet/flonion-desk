import { Menu } from "@base-ui/react/menu";
import { CircleCheck, CircleDashed, MoreHorizontal } from "lucide-react";
import {
  CARD,
  COLORS,
  FONT_BOLD,
  TEXT_BODY_BOLD,
  TEXT_CARD_TITLE,
  TEXT_LABEL,
  TEXT_MUTED,
} from "../constants";
import { BUSINESS_COLUMNS, RATING_SCALE } from "../data/projects";
import type { BusinessRow } from "../types";
import { Hint } from "../ui/Hint";
import { ProgressBar } from "../ui/ProgressBar";

/**
 * The newest businesses on the platform.
 *
 * `onboardingCompleted` belongs to the owner rather than the business, so the
 * loader reads it through the owning User and hands it over flattened.
 */
export function RecentBusinessesTable({ rows }: { rows: BusinessRow[] }) {
  const onboarded = rows.filter((row) => row.onboardingCompleted).length;

  return (
    <div className={`flex-1 ${CARD} p-5 min-w-0`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={TEXT_CARD_TITLE}>Recent businesses</p>
          <p className={`${TEXT_MUTED} flex items-center gap-1`}>
            <CircleCheck size={15} color={COLORS.greenLight} />
            <span>
              <span className={FONT_BOLD}>{onboarded} onboarded</span> of the
              last {rows.length}
            </span>
          </p>
        </div>
        {/*
          An overflow menu with disabled items: the actions are not wired to
          anything yet, so they are stated but inert rather than invented.
        */}
        <Menu.Root>
          <Menu.Trigger className="icon-button" aria-label="Business actions">
            <MoreHorizontal size={20} color={COLORS.textMuted} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="end" sideOffset={6}>
              <Menu.Popup className="menu-popup">
                <Menu.Item className="menu-item" disabled>
                  View profile
                </Menu.Item>
                <Menu.Item className="menu-item" disabled>
                  View reviews
                </Menu.Item>
                <Menu.Item className="menu-item" disabled>
                  Onboarding details
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      <div className="grid grid-cols-5 gap-4 pb-2 border-b border-[#E2E8F0]">
        {BUSINESS_COLUMNS.map((column) => (
          <span key={column} className={TEXT_LABEL}>
            {column}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={`${TEXT_MUTED} py-4`}>No businesses yet.</p>
      ) : (
        rows.map(
          ({ id, name, sector, rating, reviewCount, onboardingCompleted }) => (
            <div
              key={id}
              className="grid grid-cols-5 gap-4 items-center py-3 border-b border-[#E2E8F0] last:border-0"
            >
              {/* Tooltip carries the full name that the cell truncates. */}
              <Hint
                label={name}
                render={<span />}
                className={`${TEXT_BODY_BOLD} truncate`}
              >
                {name}
              </Hint>
              {/* Sector and the Google figures are optional on Business. */}
              <span className={`${TEXT_MUTED} truncate`}>{sector ?? "—"}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`${FONT_BOLD} text-[#4FD1C5] text-[14px] leading-[1.4]`}
                >
                  {rating === null ? "—" : rating.toFixed(1)}
                </span>
                {rating === null ? null : (
                  <ProgressBar
                    value={(rating / RATING_SCALE) * 100}
                    className="flex-1 h-0.5"
                  />
                )}
              </div>
              <span className={TEXT_BODY_BOLD}>{reviewCount ?? 0}</span>
              <span className={`${TEXT_MUTED} flex items-center gap-1.5`}>
                {onboardingCompleted ? (
                  <CircleCheck size={15} color={COLORS.green} />
                ) : (
                  <CircleDashed size={15} color={COLORS.textMuted} />
                )}
                {onboardingCompleted ? "Complete" : "Pending"}
              </span>
            </div>
          ),
        )
      )}
    </div>
  );
}
