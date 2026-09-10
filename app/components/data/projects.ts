/**
 * Column headings for the recent-businesses table, in render order. The rows
 * themselves come from the loader; only their framing lives here.
 */
export const BUSINESS_COLUMNS = [
  "BUSINESS",
  "SECTOR",
  "RATING",
  "REVIEWS",
  "ONBOARDING",
];

/** Google ratings are out of five, which is what the rating bar measures against. */
export const RATING_SCALE = 5;
