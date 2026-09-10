import {
  Building2,
  CalendarClock,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Sparkles,
  Star,
  Store,
  Users,
  UsersRound,
} from "lucide-react";
import type { NavLink } from "../types";

/**
 * The operator sections. Only Overview is built; the rest are inert rows that
 * mark where the console is going, so none of them carry an href yet.
 */
export const mainNavLinks: NavLink[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, active: true },
  { id: "businesses", label: "Businesses", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "ai-usage", label: "AI Usage", icon: Sparkles },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "meetings", label: "Meetings", icon: CalendarClock },
];

export const accountNavLinks: NavLink[] = [
  { id: "support", label: "Support Inbox", icon: LifeBuoy },
  { id: "team", label: "Team", icon: UsersRound },
  { id: "sign-out", label: "Sign Out", icon: LogOut },
];
