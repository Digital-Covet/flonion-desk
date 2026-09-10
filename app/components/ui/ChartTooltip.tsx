import { COLORS, FONT_BOLD, FONT_REGULAR } from "../constants";

/**
 * The slice of Recharts' tooltip props this console reads.
 *
 * Recharts injects the full set by cloning the element passed to
 * `Tooltip content`, so declaring only the fields used here keeps the
 * component honest about what it depends on.
 */
type ChartTooltipProps = {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  /** Copy after the figure, e.g. "reviews". Singularised at 1. */
  noun: string;
  /** `dark` sits on the signups panel's gradient, `light` on a white card. */
  tone?: "light" | "dark";
};

/**
 * Hover readout for both charts.
 *
 * The bucket's exact count is otherwise unrecoverable from the drawing — the
 * axis is rounded to friendly steps — so this is the only place the operator
 * can read a week's figure rather than estimate it.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  noun,
  tone = "light",
}: ChartTooltipProps) {
  const entry = payload?.[0];
  if (!active || entry?.value == null) return null;

  const value = Number(entry.value);
  const dark = tone === "dark";

  return (
    <div
      className="rounded-[10px] px-3 py-2 pointer-events-none"
      style={{
        background: dark ? "#151928" : COLORS.white,
        boxShadow: "0px 4px 12px 0px rgba(0,0,0,0.12)",
      }}
    >
      <p
        className={`${FONT_REGULAR} text-[11px] leading-[1.4]`}
        style={{ color: COLORS.textMuted }}
      >
        {label}
      </p>
      <p
        className={`${FONT_BOLD} text-[14px] leading-[1.4]`}
        style={{ color: dark ? COLORS.white : COLORS.textDark }}
      >
        {value} {value === 1 ? noun.replace(/s$/, "") : noun}
      </p>
    </div>
  );
}
