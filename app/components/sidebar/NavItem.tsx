import { Button } from "@base-ui/react/button";
import { Link, useLocation } from "react-router";
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
 * A row with a destination is a real link. A row without one keeps the old
 * behaviour: Base UI's Button rendered as a div, so it is focusable and
 * announced as a control but navigates nowhere. Both share the same body, so
 * a section becoming real is a one-line change in the nav data.
 */
export function NavItem({ label, to, nested, icon: Icon }: NavLink) {
  const { pathname } = useLocation();
  const active = to ? isActive(pathname, to, nested) : false;

  const className =
    "flex items-center gap-3 px-3 py-2 rounded-[15px] cursor-pointer";
  const style = active
    ? { backgroundColor: COLORS.white, boxShadow: CARD_SHADOW_STRONG }
    : {};

  const body = (
    <>
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
    </>
  );

  if (!to) {
    return (
      <Button
        render={<div />}
        nativeButton={false}
        className={className}
        style={style}
      >
        {body}
      </Button>
    );
  }

  return (
    <Link
      to={to}
      className={className}
      style={style}
      aria-current={active ? "page" : undefined}
    >
      {body}
    </Link>
  );
}

/**
 * Whether a nav row owns the current URL.
 *
 * "/" would prefix-match every path, so the root is compared exactly. A
 * `nested` row also claims its descendants, but only at a segment boundary —
 * without that check "/businesses" would light up for "/businesses-archive".
 */
function isActive(pathname: string, to: string, nested?: boolean): boolean {
  if (to === "/") return pathname === "/";
  if (pathname === to) return true;
  return nested === true && pathname.startsWith(`${to}/`);
}
