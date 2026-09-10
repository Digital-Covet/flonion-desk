import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  CARD,
  COLORS,
  DARK_GRADIENT,
  FONT_BOLD,
  TEXT_CARD_TITLE,
  TEXT_LABEL,
  TEXT_MUTED,
} from "../constants";
import {
  SIGNUPS_BAR_GAP,
  SIGNUPS_MIN_BAR_PIXELS,
  SIGNUPS_VIEWBOX,
} from "../data/charts";
import type { ChartPoint } from "../types";
import { ChartTooltip } from "../ui/ChartTooltip";
import { ProgressBar } from "../ui/ProgressBar";

/**
 * Verified signups per week over the loader's window.
 *
 * The bars are a Recharts `BarChart` rather than a row of sized divs, which
 * is what buys the hover readout: a bar's height is relative to the best week
 * and never states its own figure. The summary row underneath is derived from
 * the same series rather than fetched separately, so the bars and the figures
 * can never disagree.
 */
export function SignupsChart({ series }: { series: ChartPoint[] }) {
  const values = series.map((point) => point.value);
  const peak = Math.max(0, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const latest = values.at(-1) ?? 0;
  const average = values.length ? total / values.length : 0;

  const summary = [
    { label: "In window", value: total },
    { label: "Best week", value: peak },
    { label: "This week", value: latest },
    { label: "Weekly avg", value: Math.round(average * 10) / 10 },
  ];

  return (
    <div
      className={`flex-none ${CARD} p-5 flex flex-col`}
      style={{ width: 380 }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className={TEXT_CARD_TITLE}>New signups</p>
          <p className={TEXT_MUTED}>
            <span className={`${FONT_BOLD} text-[#48BB78]`}>({total})</span>{" "}
            verified users, last {series.length} weeks
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div
        className="rounded-[12px] p-4 mb-4 flex-none"
        style={{ background: DARK_GRADIENT, height: 170 }}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={SIGNUPS_VIEWBOX}
        >
          <BarChart
            data={series}
            accessibilityLayer
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={SIGNUPS_BAR_GAP}
          >
            {/*
              The bars carry no visible axis, but Recharts labels a tooltip
              with the category axis's value and falls back to the array index
              without one — hence a hidden axis rather than none, so the
              readout names the week ("12 Aug") instead of its position.
            */}
            <XAxis dataKey="label" hide />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.08)", radius: 8 }}
              content={<ChartTooltip noun="signups" tone="dark" />}
            />
            <Bar
              dataKey="value"
              fill={COLORS.white}
              fillOpacity={0.8}
              radius={[15, 15, 15, 15]}
              minPointSize={SIGNUPS_MIN_BAR_PIXELS}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {summary.map(({ label, value }) => (
          <div key={label}>
            <div className="flex items-center gap-1 mb-1">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: COLORS.teal }}
              />
              <span className={TEXT_LABEL}>{label}</span>
            </div>
            <p className={TEXT_CARD_TITLE}>{value}</p>
            <ProgressBar
              value={peak ? Math.min((value / peak) * 100, 100) : 0}
              className="h-0.5 w-full mt-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
