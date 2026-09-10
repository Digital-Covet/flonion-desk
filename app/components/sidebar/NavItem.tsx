import { Button } from "@base-ui/react/button";
import {
  CARD_SHADOW,
  CARD_SHADOW_STRONG,
  COLORS,
  FONT_BOLD,
} from "../constants";
import type { NavLink } from "../types";

/**
 * A sidebar nav row. The icon colour follows the active state here rather
 * than being hard-coded per icon, which is how the original ended up with a
 * white "Dashboard" glyph and teal defaults everywhere else.
 *
 * Rendered through Base UI's Button as a div with button semantics, so the
 * row is focusable and announced as a control — while the sections remain
 * unwired, pressing it performs no navigation.
 */
export function NavItem({ label, active, icon: Icon }: NavLink) {
  return (
    <Button
      render={<div />}
      nativeButton={false}
      className="flex items-center gap-3 px-3 py-2 rounded-[15px] cursor-pointer"
      style={
        active
          ? { backgroundColor: COLORS.white, boxShadow: CARD_SHADOW_STRONG }
          : {}
      }
    >
      <div
        className="flex items-center justify-center rounded-[12px] size-[30px] flex-none"
        style={
          active
            ? { backgroundColor: COLORS.teal }
            : { backgroundColor: COLORS.white, boxShadow: CARD_SHADOW }
        }
      >
        <Icon size={15} color={active ? COLORS.white : COLORS.teal} />
      </div>
      <span
        className={`text-[12px] leading-[1.5] ${FONT_BOLD}`}
        style={{ color: active ? COLORS.textDark : COLORS.textMuted }}
      >
        {label}
      </span>
    </Button>
  );
}
