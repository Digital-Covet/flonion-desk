import { Building2, Sparkles, Star, UserCheck } from "lucide-react";
import { COLORS, OUTLINE_STROKE_WIDTH } from "../constants";
import type { StatTile } from "../types";

/**
 * The four tiles in the top row, look only. `id` is the join key: the loader
 * returns a figure under the same key and Dashboard pairs them up, so a tile
 * can never ship with a number baked into it.
 */
export const statTiles: StatTile[] = [
  {
    id: "businesses",
    label: "Businesses onboarded",
    iconBg: COLORS.teal,
    icon: Building2,
    iconProps: {
      size: 14,
      color: COLORS.white,
      strokeWidth: OUTLINE_STROKE_WIDTH,
    },
  },
  {
    id: "verifiedUsers",
    label: "Verified users",
    iconBg: COLORS.teal,
    icon: UserCheck,
    iconProps: {
      size: 14,
      color: COLORS.white,
      strokeWidth: OUTLINE_STROKE_WIDTH,
    },
  },
  {
    id: "reviews",
    label: "Reviews collected",
    iconBg: COLORS.teal,
    icon: Star,
    iconProps: { size: 14, color: COLORS.white },
  },
  {
    id: "aiGenerations",
    label: "AI generations",
    iconBg: COLORS.teal,
    icon: Sparkles,
    iconProps: { size: 16, color: COLORS.white },
  },
];
