import { MessageSquareHeart, Send, UserPlus } from "lucide-react";
import { COLORS } from "../constants";
import type { ActivityKind, ActivityStyle } from "../types";

/**
 * How each activity source is drawn. The feed merges three tables that share
 * no shape beyond a timestamp, so the loader tags every row with a `kind` and
 * the styling is looked up here rather than travelling with the data.
 */
export const activityStyles: Record<ActivityKind, ActivityStyle> = {
  join: {
    iconBg: COLORS.blue,
    icon: UserPlus,
    iconProps: { size: 16, color: COLORS.white },
  },
  invite: {
    iconBg: COLORS.purple,
    icon: Send,
    iconProps: { size: 14, color: COLORS.white },
  },
  feedback: {
    iconBg: COLORS.orange,
    icon: MessageSquareHeart,
    iconProps: { size: 14, color: COLORS.white },
  },
};
