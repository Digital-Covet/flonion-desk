import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "lucide-react";
import { COLORS, OUTLINE_STROKE_WIDTH } from "../constants";
import { sidebarDrawer } from "./drawerHandle";

/**
 * Opens the sidebar drawer. Hidden from `lg` up, where the rail is already
 * on screen and there is nothing to open.
 */
export function SidebarTrigger() {
  return (
    <Drawer.Trigger
      handle={sidebarDrawer}
      aria-label="Open navigation"
      className="icon-button sidebar-drawer-trigger mt-0.5"
    >
      <Menu
        size={20}
        color={COLORS.textDark}
        strokeWidth={OUTLINE_STROKE_WIDTH}
      />
    </Drawer.Trigger>
  );
}
