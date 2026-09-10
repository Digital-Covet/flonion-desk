import { Tooltip } from "@base-ui/react/tooltip";

type HintProps = {
  /** Tooltip text, shown on hover and keyboard focus. */
  label: string;
  /** Trigger content, e.g. an icon. */
  children: React.ReactNode;
  /**
   * Element to render the trigger as instead of the default button. Used when
   * the trigger must stay an inert layout element (the operator chip, a table
   * cell span) rather than gain button semantics.
   */
  render?: React.ReactElement;
  /** Classes for the trigger. Defaults to the `icon-button` reset. */
  className?: string;
};

/**
 * One place for the tooltip anatomy, so every trigger in the console gets the
 * same portal, offset and popup look instead of each call site repeating the
 * Root/Trigger/Portal/Positioner/Popup chain.
 */
export function Hint({ label, children, render, className }: HintProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={render}
        className={render ? className : (className ?? "icon-button")}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
