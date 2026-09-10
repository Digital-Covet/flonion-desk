import { Progress } from "@base-ui/react/progress";
import { COLORS } from "../constants";

type ProgressBarProps = {
  /** Fill percentage, 0-100. */
  value: number;
  /** Layout classes for the outer box, e.g. sizing and margins. */
  className?: string;
  /** Colour of the filled portion. */
  color?: string;
};

/**
 * The 2px completion bar used by both the Projects table and the Active
 * Users stat row, which previously repeated the same track/fill div pair.
 *
 * Base UI supplies the `progressbar` role and the indicator width; the
 * track and indicator carry the original classes so the box model is
 * unchanged.
 */
export function ProgressBar({
  value,
  className,
  color = COLORS.teal,
}: ProgressBarProps) {
  return (
    <Progress.Root value={value} className={className}>
      <Progress.Track className="h-full w-full rounded-full bg-[#E2E8F0]">
        <Progress.Indicator
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </Progress.Track>
    </Progress.Root>
  );
}
