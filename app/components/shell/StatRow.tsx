import { CARD, FONT_HEADING, TEXT_LABEL } from "../constants";

export interface StatItem {
  id: string;
  label: string;
  value: number;
  /** Shown instead of the number when the figure cannot be trusted. */
  note?: string;
}

/**
 * Headline figures above a section table.
 *
 * Deliberately plainer than the overview's `StatCard`: those carry an icon and
 * a month-on-month delta, which only makes sense for the four platform metrics
 * the overview is built around. A section header wants the count and nothing
 * competing with it.
 */
export function StatRow({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((item) => (
        <div key={item.id} className={`${CARD} px-5 py-4`}>
          <p className={`${TEXT_LABEL} uppercase tracking-wide`}>
            {item.label}
          </p>
          <p
            className={`${FONT_HEADING} text-[#2D3748] text-[22px] leading-[1.3] mt-1`}
          >
            {item.value.toLocaleString("en-IN")}
          </p>
          {item.note ? (
            <p className={`${TEXT_LABEL} mt-1 normal-case`}>{item.note}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
