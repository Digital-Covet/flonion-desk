import {
  CARD_BACKDROP_SHADOW_CLASS,
  DARK_GRADIENT,
  FONT_BOLD,
  FONT_REGULAR,
  PANEL_OVERLAY,
} from "../constants";
import type { NavLink } from "../types";

/**
 * Jump-off points to the other operator sections.
 *
 * The template filled this slot with a photograph behind a dark overlay; the
 * photo is gone but the overlay sits on the same dark gradient, so the panel
 * still anchors the right of the row. Sections are inert until they exist, so
 * these are labels rather than links.
 *
 * The row is a fixed 200px, so the section list cannot pick its own number of
 * columns: two columns needs four rows for seven sections, which overflows the
 * panel and leaves a hole in the last row. `auto-fit` lets the track count
 * follow the panel's width instead, keeping the block short enough to fit and
 * the ragged tail down to a single cell.
 */
export function ShortcutsCard({ sections }: { sections: NavLink[] }) {
  return (
    <div
      className={`flex-1 rounded-[15px] overflow-hidden relative ${CARD_BACKDROP_SHADOW_CLASS}`}
      style={{ minHeight: 200, background: DARK_GRADIENT }}
    >
      <div className="absolute inset-0" style={{ background: PANEL_OVERLAY }} />
      <div className="relative p-6 h-full flex flex-col">
        <p className={`${FONT_BOLD} text-white text-[18px] leading-[1.4] mb-1`}>
          Console sections
        </p>
        <p
          className={`${FONT_REGULAR} text-white/70 text-[12px] leading-[1.5] mb-4`}
        >
          Not yet wired up
        </p>

        <div
          className="grid gap-x-4 gap-y-3 flex-1 content-center"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
          }}
        >
          {sections.map(({ id, label, icon: Icon }) => (
            <div key={id} className="flex items-center gap-2 min-w-0">
              <div className="size-[22px] rounded-[8px] bg-white/15 flex items-center justify-center flex-none">
                <Icon size={13} color="white" />
              </div>
              <span
                className={`${FONT_REGULAR} text-white/90 text-[12px] leading-[1.5] truncate`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
