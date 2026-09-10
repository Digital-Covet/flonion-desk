import { Input } from "@base-ui/react/input";
import { Bell, Search, Settings, UserCog } from "lucide-react";
import {
  CHIP,
  COLORS,
  FONT_BOLD,
  FONT_REGULAR,
  OUTLINE_STROKE_WIDTH,
  TEXT_CARD_TITLE,
  TEXT_MUTED_SM,
} from "../constants";
import { SidebarTrigger } from "../sidebar/SidebarTrigger";
import { Hint } from "../ui/Hint";

export function Header() {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-start gap-3">
        {/* Below `lg` the sidebar rail is gone; this is the way back to it. */}
        <SidebarTrigger />
        <div>
          <p className={TEXT_MUTED_SM}>
            Flonion Desk /{" "}
            <span className={`${FONT_BOLD} text-[#2D3748]`}>Overview</span>
          </p>
          <h1 className={TEXT_CARD_TITLE}>Overview</h1>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/*
          A real input, so the box accepts text and exposes placeholder
          semantics — it filters nothing yet because no view on this screen
          has a search target.
        */}
        <div className={`flex items-center gap-2 ${CHIP} px-3 py-2`}>
          <Search
            size={16}
            color={COLORS.textMuted}
            strokeWidth={OUTLINE_STROKE_WIDTH}
          />
          <Input
            aria-label="Search"
            placeholder="Type here..."
            className={`${FONT_REGULAR} w-[140px] bg-transparent outline-none text-[12px] leading-[1.5] text-[#2D3748] placeholder:text-[#A0AEC0]`}
          />
        </div>
        {/*
          TODO: identify the signed-in operator once the schema can express
          one. `User.role` holds the six Flonion *team* roles (admin, member,
          designer, developer, manager, marketing), which describe a customer's
          own staff — there is no column marking a member of the Flonion team,
          so nothing here can be resolved from the database yet. Rendered as an
          inert chip; the tooltip replaces the old `title` hint.
        */}
        <Hint
          label="Placeholder — no operator identity in the schema yet"
          render={<div />}
          className={`flex items-center gap-2 ${CHIP} px-3 py-1.5`}
        >
          <div
            className="size-[22px] rounded-full flex items-center justify-center flex-none"
            style={{ backgroundColor: COLORS.teal }}
          >
            <UserCog
              size={13}
              color={COLORS.white}
              strokeWidth={OUTLINE_STROKE_WIDTH}
            />
          </div>
          <span
            className={`${FONT_BOLD} text-[#2D3748] text-[12px] leading-[1.5]`}
          >
            Platform Operator
          </span>
        </Hint>
        {/* Icon buttons: real buttons with tooltips instead of bare glyphs. */}
        <Hint label="Settings — not wired up yet">
          <Settings
            size={16}
            color={COLORS.textMuted}
            strokeWidth={OUTLINE_STROKE_WIDTH}
          />
        </Hint>
        <Hint label="Notifications — none">
          <Bell size={16} color={COLORS.textMuted} />
        </Hint>
      </div>
    </div>
  );
}
