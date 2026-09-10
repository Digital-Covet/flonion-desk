import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CARD,
  COLORS,
  FONT_BOLD,
  TEXT_CARD_TITLE,
  TEXT_MUTED,
} from "../constants";
import { axisMax, REVIEWS_GRID_LINES, REVIEWS_VIEWBOX } from "../data/charts";
import type { ChartPoint } from "../types";
import { ChartTooltip } from "../ui/ChartTooltip";

/** Axis and tick styling, matching TEXT_AXIS in SVG terms. */
const AXIS_TICK = {
  fill: COLORS.axis,
  fontSize: 10,
  fontWeight: 700,
} as const;

/**
 * Reviews collected per week over the loader's window.
 *
 * The template drew this from fixed path data exported out of the design
 * file, which the previous pass replaced with path maths over the series.
 * Recharts owns the geometry now — scales, ticks and the hover target are
 * its job, so what is left here is the framing and the loader's numbers.
 */
export function ReviewsChart({ series }: { series: ChartPoint[] }) {
  const values = series.map((point) => point.value);
  const total = values.reduce((sum, value) => sum + value, 0);

  // The axis is rounded up to a friendly top so the labels read 0/4/8 rather
  // than 0/3.8/7.6; the ticks are pinned to match, since Recharts would
  // otherwise pick its own and disagree with the grid.
  const top = axisMax(values);
  const ticks = Array.from(
    { length: REVIEWS_GRID_LINES },
    (_, index) => (top / (REVIEWS_GRID_LINES - 1)) * index,
  );

  return (
    <div className={`flex-1 ${CARD} p-5 min-w-0`}>
      <p className={`${TEXT_CARD_TITLE} mb-0.5`}>Reviews collected</p>
      <p className={`${TEXT_MUTED} mb-4`}>
        <span className={`${FONT_BOLD} text-[#48BB78]`}>({total})</span> in the
        last {series.length} weeks
      </p>

      <ResponsiveContainer
        width="100%"
        height={REVIEWS_VIEWBOX.height}
        // Without this the chart is blank until hydration, because the
        // container has no element to measure on the server.
        initialDimension={REVIEWS_VIEWBOX}
      >
        <AreaChart
          data={series}
          accessibilityLayer
          margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="tealGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={COLORS.teal} stopOpacity={0.54} />
              <stop offset="1" stopColor={COLORS.teal} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            strokeDasharray="4 4"
            stroke={COLORS.border}
          />
          <XAxis
            dataKey="label"
            interval={0}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={AXIS_TICK}
            className="font-sans"
          />
          <YAxis
            width={28}
            domain={[0, top]}
            ticks={ticks}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            className="font-sans"
          />
          <Tooltip
            cursor={{ stroke: COLORS.border, strokeWidth: 1 }}
            content={<ChartTooltip noun="reviews" />}
          />

          <Area
            type="linear"
            dataKey="value"
            stroke={COLORS.teal}
            strokeWidth={3}
            fill="url(#tealGrad)"
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 4, fill: COLORS.teal, stroke: COLORS.white }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
