import { TriangleAlert } from "lucide-react";
import {
  CARD,
  COLORS,
  FONT_BOLD,
  TEXT_CARD_TITLE,
  TEXT_MUTED,
} from "../constants";

/**
 * What a section renders when its read failed.
 *
 * Every section shows this rather than an empty table, because an empty table
 * and a broken query look identical to an operator and mean opposite things.
 * No figure is invented to keep the layout intact.
 */
export function SectionError({
  title,
  detail,
  error,
}: {
  title: string;
  detail: string;
  /** The underlying message, when there is one worth showing. */
  error: string | null;
}) {
  return (
    <div className={`${CARD} p-6 mb-6 flex items-start gap-3`}>
      <TriangleAlert size={20} color={COLORS.red} className="flex-none" />
      <div>
        <p className={TEXT_CARD_TITLE}>{title}</p>
        <p className={TEXT_MUTED}>{detail}</p>
        {error ? (
          <p className={`${TEXT_MUTED} mt-1 ${FONT_BOLD}`}>{error}</p>
        ) : null}
      </div>
    </div>
  );
}
