/**
 * Design tokens lifted out of Dashboard.tsx / Sidebar.tsx.
 *
 * Every string here is a verbatim copy of a literal that appeared inline in
 * the original files. Nothing is normalised or "tidied" — the point is that
 * changing a token is now one edit instead of ~40.
 */

export const COLORS = {
  textDark: "#2D3748",
  textMuted: "#A0AEC0",
  axis: "#CBD5E0",
  border: "#E2E8F0",
  teal: "#4FD1C5",
  tealDark: "#38B2AC",
  green: "#48BB78",
  greenLight: "#68D391",
  red: "#FC8181",
  white: "white",
  // Accents for the activity feed, which needs one colour per source.
  blue: "#4299E1",
  purple: "#9F7AEA",
  orange: "#F6AD55",
} as const;

// The console's type scale: Jost (font-sans) for body copy, Rubik
// (font-heading) for headings. Both families are installed via
// @fontsource-variable and exposed as Tailwind theme tokens in app.css, so
// the classes below reference tokens instead of naming fonts directly —
// the one deliberate departure from the "verbatim copy" rule above, made
// so the whole console tracks the app-wide font tokens.
export const FONT_BOLD = "font-sans font-bold";
export const FONT_REGULAR = "font-sans font-normal";
export const FONT_HEADING = "font-heading font-bold";

export const CARD_SHADOW = "0px 3.5px 5.5px 0px rgba(0,0,0,0.02)";
export const CARD_SHADOW_STRONG = "0px 3.5px 5.5px 0px rgba(0,0,0,0.06)";

/**
 * Backdrop shadow lifting a panel off the page.
 *
 * Two layers rather than one: a tight contact shadow that keeps the 15px
 * corners crisp, and a wide, low-opacity cast that reads as depth. The Tailwind
 * form is the same pair of layers, spelled with underscores so it survives as
 * an arbitrary value.
 */
export const CARD_BACKDROP_SHADOW =
  "0px 2px 4px 0px rgba(0,0,0,0.04), 0px 10px 24px -4px rgba(0,0,0,0.08)";
export const CARD_BACKDROP_SHADOW_CLASS =
  "shadow-[0px_2px_4px_0px_rgba(0,0,0,0.04),0px_10px_24px_-4px_rgba(0,0,0,0.08)]";

/** White panel with the standard 15px radius and the backdrop shadow. */
export const CARD = `bg-white rounded-[15px] ${CARD_BACKDROP_SHADOW_CLASS}`;

/**
 * Small white control — the header's search box and operator chip.
 *
 * Same surface as CARD, but it keeps the original hairline shadow: these are
 * inline controls sitting in the page header, and the card backdrop reads as a
 * floating panel at that size.
 */
export const CHIP =
  "bg-white rounded-[15px] shadow-[0px_3.5px_5.5px_0px_rgba(0,0,0,0.02)]";

export const TEXT_CARD_TITLE = `${FONT_HEADING} text-[#2D3748] text-[18px] leading-[1.4]`;
export const TEXT_BODY_BOLD = `${FONT_BOLD} text-[#2D3748] text-[14px] leading-[1.4]`;
export const TEXT_MUTED = `${FONT_REGULAR} text-[#A0AEC0] text-[14px] leading-[1.4]`;
export const TEXT_MUTED_SM = `${FONT_REGULAR} text-[#A0AEC0] text-[12px] leading-[1.5]`;
export const TEXT_LABEL = `${FONT_BOLD} text-[#A0AEC0] text-[10px] leading-[1.5]`;
export const TEXT_AXIS = `${FONT_BOLD} text-[10px] text-[#CBD5E0] leading-[1.5]`;

export const DARK_GRADIENT =
  "linear-gradient(67.64deg, #313860 2.25%, #151928 79.87%)";
export const ACCENT_GRADIENT =
  "linear-gradient(135deg, #868CFF 0%, #4FD1C5 100%)";
export const PANEL_OVERLAY =
  "linear-gradient(135deg, rgba(49,56,96,0.9) 0%, rgba(21,25,40,0.7) 100%)";

/** Stroke weight used by the hand-drawn outline icons in the original files. */
export const OUTLINE_STROKE_WIDTH = 1.5;
