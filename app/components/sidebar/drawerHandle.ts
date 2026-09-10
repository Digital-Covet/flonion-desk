import { Drawer } from "@base-ui/react/drawer";

/**
 * Links the header's menu button to the sidebar drawer.
 *
 * The trigger sits in the dashboard header and the drawer's contents sit
 * beside the desktop rail, so nesting the trigger inside `Drawer.Root` would
 * mean threading open state through Dashboard, which has no interest in it.
 * A handle is Base UI's answer for a detached trigger.
 */
export const sidebarDrawer = Drawer.createHandle();
