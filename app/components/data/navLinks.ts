import {
  Building2,
  CalendarClock,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Sparkles,
  Star,
  Store,
  Users,
  UsersRound,
} from "lucide-react";
import type { NavLink } from "../types";

/**
 * The operator sections.
 *
 * A row carries a `to` once its section exists. The ones without a
 * destination are not placeholders for their own sake: they tell an operator
 * what this console is going to cover, and they stay inert rather than
 * navigating to an empty page.
 */
export const mainNavLinks: NavLink[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, to: "/" },
  {
    id: "businesses",
    label: "Businesses",
    icon: Building2,
    to: "/businesses",
    nested: true,
  },
  { id: "users", label: "Users", icon: Users, to: "/users", nested: true },
  { id: "reviews", label: "Reviews", icon: Star, to: "/reviews" },
  { id: "ai-usage", label: "AI Usage", icon: Sparkles, to: "/ai-usage" },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: Store,
    to: "/marketplace",
  },
  { id: "meetings", label: "Meetings", icon: CalendarClock, to: "/meetings" },
];

export const accountNavLinks: NavLink[] = [
  {
    id: "support",
    label: "Support Inbox",
    icon: MessageSquare,
    to: "/support",
  },
  { id: "team", label: "Team", icon: UsersRound },
  { id: "sign-out", label: "Sign Out", icon: LogOut },
];
