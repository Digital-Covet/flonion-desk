import { Drawer } from "@base-ui/react/drawer";
import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { COLORS, OUTLINE_STROKE_WIDTH } from "../constants";
import { sidebarDrawer } from "./drawerHandle";
import { SidebarPanel } from "./SidebarPanel";

/** Matches the `lg` breakpoint at which the fixed rail takes over. */
const RAIL_VISIBLE = "(min-width: 64rem)";

/**
 * The sidebar as a left-edge drawer, for viewports too narrow for the rail.
 *
 * Drawer rather than Dialog because the panel is swipe-dismissible: dragging
 * it left closes it, and the popup is `--bleed` wider than the rail so an
 * over-swipe rubber-bands against a filled edge instead of a bare gap. The
 * visual styling lives in app.css next to the other Base UI popup surfaces.
 */
export function SidebarDrawer() {
  const actionsRef = useRef<Drawer.Root.Actions>(null);
  const railVisible = useMediaQuery(RAIL_VISIBLE, { defaultMatches: false });

  // Widening the window past `lg` puts the rail back on screen. Left open,
  // the drawer would keep focus trapped behind navigation the operator can
  // already see, so the resize dismisses it.
  useEffect(() => {
    if (railVisible) {
      actionsRef.current?.close();
    }
  }, [railVisible]);

  return (
    <Drawer.Root
      handle={sidebarDrawer}
      actionsRef={actionsRef}
      swipeDirection="left"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="sidebar-drawer-backdrop" />
        <Drawer.Viewport className="sidebar-drawer-viewport">
          <Drawer.Popup className="sidebar-drawer-popup">
            <Drawer.Content className="relative h-full w-full">
              {/*
                The rail has no heading of its own — the wordmark is a logo,
                not a label — so the drawer supplies the accessible name that
                a dialog is required to have.
              */}
              <Drawer.Title className="sr-only">
                Console navigation
              </Drawer.Title>
              <SidebarPanel />
              <Drawer.Close
                aria-label="Close navigation"
                className="icon-button absolute right-3 top-6"
              >
                <X
                  size={16}
                  color={COLORS.textMuted}
                  strokeWidth={OUTLINE_STROKE_WIDTH}
                />
              </Drawer.Close>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
