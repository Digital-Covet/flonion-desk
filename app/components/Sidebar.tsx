import { SidebarDrawer } from "./sidebar/SidebarDrawer";
import { SidebarPanel } from "./sidebar/SidebarPanel";

/**
 * Navigation in its two forms: a fixed rail from `lg` up, and a swipe-
 * dismissible drawer below it. Both render the same SidebarPanel, so there
 * is one nav to keep current rather than a desktop copy and a mobile one.
 */
export default function Sidebar() {
  return (
    <>
      <aside
        className="hidden h-full flex-none lg:block"
        style={{ width: 246 }}
      >
        <SidebarPanel />
      </aside>
      <SidebarDrawer />
    </>
  );
}
