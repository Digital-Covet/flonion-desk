import { Input } from "@base-ui/react/input";
import { Bell, Search, Settings, UserCog } from "lucide-react";
import { Link } from "react-router";
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

/** One step in the breadcrumb. Without a `to` it renders as plain text. */
export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  /**
   * Breadcrumb steps after "Flonion Desk". Defaults to the title alone, which
   * is right for a top-level section; a detail page passes its parent too.
   */
  trail?: Crumb[];
  /** Who is driving the console, when it can be determined. */
  operator?: string | null;
  /**
   * Render the inert search chip. Only the overview does: it has no view to
   * filter, and every section that does gets a real filter bar instead.
   */
  showSearch?: boolean;
}

/**
 * The bar at the top of every section: where you are on the left, who you are
 * and the global controls on the right.
 *
 * Extracted from the overview's own header once a second screen existed. The
 * right-hand cluster is deliberately identical everywhere — it describes the
 * console, not the page.
 */
export function PageHeader({
  title,
  trail,
  operator,
  showSearch = false,
}: PageHeaderProps) {
  const steps = trail ?? [{ label: title }];

  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-start gap-3">
        {/* Below `lg` the sidebar rail is gone; this is the way back to it. */}
        <SidebarTrigger />
        <div>
          <p className={TEXT_MUTED_SM}>
            Flonion Desk
            {steps.map((step, index) => {
              const last = index === steps.length - 1;
              return (
                <span key={step.label}>
                  {" / "}
                  {step.to && !last ? (
                    <Link to={step.to} className="hover:underline">
                      {step.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        last ? `${FONT_BOLD} text-[#2D3748]` : undefined
                      }
                    >
                      {step.label}
                    </span>
                  )}
                </span>
              );
            })}
          </p>
          <h1 className={TEXT_CARD_TITLE}>{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {showSearch ? (
          /*
            A real input, so the box accepts text and exposes placeholder
            semantics — it filters nothing here because the overview has no
            search target. Sections use FilterBar instead.
          */
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
        ) : null}
        {/*
          The operator's identity comes from the console's own token map, not
          from `User.role` — that column holds a customer's staff roles and has
          nothing to say about who is operating this console. Until the console
          has real accounts, an unauthenticated reader is labelled as such
          rather than being given a title it has not earned.
        */}
        <Hint
          label={
            operator
              ? `Signed in with an operator token as ${operator}`
              : "No operator token presented — reads are open, writes are not"
          }
          render={<div />}
          className={`flex items-center gap-2 ${CHIP} px-3 py-1.5`}
        >
          <div
            className="size-[22px] rounded-full flex items-center justify-center flex-none"
            style={{
              backgroundColor: operator ? COLORS.teal : COLORS.textMuted,
            }}
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
            {operator ?? "Unidentified"}
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
