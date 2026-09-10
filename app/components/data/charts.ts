/**
 * Chart framing. Both charts are weekly buckets over a fixed recent window,
 * so neither the labels nor the axis values can be fixed here — they are
 * derived from the loader series. What stays is the geometry.
 */

/** Number of horizontal grid lines, and so of Y-axis labels, on the reviews chart. */
export const REVIEWS_GRID_LINES = 6;

/**
 * Size the reviews chart is drawn at before hydration.
 *
 * Recharts measures its container to lay a chart out, and there is nothing to
 * measure during the server render, so this is what the operator sees until
 * the real width is known. It is close to the rendered size on purpose: a
 * figure far off the mark buys a visible reflow instead of a blank panel.
 */
export const REVIEWS_VIEWBOX = { width: 840, height: 250 };

/** Same, for the signups panel's interior once its padding is taken off. */
export const SIGNUPS_VIEWBOX = { width: 308, height: 138 };

/**
 * Keeps a flat series off the floor of the signups chart, in pixels: an empty
 * week draws a stub rather than nothing at all, so the axis stays readable.
 */
export const SIGNUPS_MIN_BAR_PIXELS = 6;

/** Gap between signup bars, in pixels. */
export const SIGNUPS_BAR_GAP = 4;

/**
 * Rounds a series maximum up to a friendly axis top, so the Y labels read
 * 0/2/4 rather than 0/1.6/3.2.
 */
export function axisMax(values: number[]): number {
  const peak = Math.max(0, ...values);
  if (peak === 0) return REVIEWS_GRID_LINES - 1;

  const step = Math.ceil(peak / (REVIEWS_GRID_LINES - 1));
  return step * (REVIEWS_GRID_LINES - 1);
}
