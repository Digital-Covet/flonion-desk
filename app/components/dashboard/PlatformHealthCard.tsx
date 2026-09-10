import { Activity } from "lucide-react";
import {
  ACCENT_GRADIENT,
  CARD,
  COLORS,
  FONT_BOLD,
  FONT_REGULAR,
  TEXT_CARD_TITLE,
  TEXT_MUTED_SM,
} from "../constants";
import type { HealthMetric } from "../types";

/**
 * Reach and account-security figures for the platform as a whole. Occupies
 * the slot the template used for its product promo, gradient panel included,
 * so the row keeps its visual weight.
 */
export function PlatformHealthCard({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <div className={`flex-1 ${CARD} overflow-hidden flex`}>
      <div className="flex-1 p-6">
        <p className={`${TEXT_MUTED_SM} mb-1`}>Across every account</p>
        <p className={`${TEXT_CARD_TITLE} mb-4`}>Platform health</p>

        <div className="flex gap-8">
          {metrics.map(({ id, label, value }) => (
            <div key={id}>
              <p
                className={`${FONT_BOLD} text-[#2D3748] text-[20px] leading-[1.3]`}
              >
                {value.toLocaleString("en-US")}
              </p>
              <p className={`${FONT_REGULAR} text-[#A0AEC0] text-[12px]`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div
        className="w-[200px] flex-none rounded-r-[15px] flex items-center justify-center"
        style={{ background: ACCENT_GRADIENT }}
      >
        <Activity size={44} color={COLORS.white} strokeWidth={1.5} />
      </div>
    </div>
  );
}
