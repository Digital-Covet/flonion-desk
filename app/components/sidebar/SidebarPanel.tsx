import { Gauge } from "lucide-react";
import { COLORS, FONT_BOLD } from "../constants";
import { accountNavLinks, mainNavLinks } from "../data/navLinks";
import { NavItem } from "./NavItem";
import { SidebarDivider } from "./SidebarDivider";

/**
 * The sidebar's contents, with no opinion about where they sit.
 *
 * Two callers render this: the fixed rail on wide screens, and the drawer
 * popup below `lg`. Keeping the markup in one place is the point — the
 * mobile menu is the same navigation, not a second copy of it that drifts.
 */
export function SidebarPanel() {
  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-5">
        <div
          className="size-[26px] rounded-[8px] flex items-center justify-center flex-none"
          style={{ backgroundColor: COLORS.teal }}
        >
          <Gauge size={16} color={COLORS.white} />
        </div>
        <span
          className={`${FONT_BOLD} text-[14px] text-[#2D3748] leading-[1.5]`}
        >
          FLONION DESK
        </span>
      </div>

      <SidebarDivider />

      {/* Main nav */}
      <nav className="flex flex-col gap-1 px-3">
        {mainNavLinks.map((link) => (
          <NavItem key={link.id} {...link} />
        ))}
      </nav>

      {/* Account Pages */}
      <div className="px-6 pt-5 pb-2">
        <span
          className={`${FONT_BOLD} text-[12px] text-[#2D3748] leading-[1.5]`}
        >
          ACCOUNT
        </span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {accountNavLinks.map((link) => (
          <NavItem key={link.id} {...link} />
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}
