import { Checkbox } from "@base-ui/react/checkbox";
import { COLORS, FONT_BOLD, FONT_REGULAR, TEXT_LABEL } from "../constants";

export interface FilterCheckboxOption {
  value: string;
  label: string;
}

/**
 * A checkbox group for multi-value filter params in GET forms.
 *
 * Each checked checkbox contributes to a hidden input that serialises
 * selected values as a comma-separated string, matching the loader
 * parsing convention (e.g. `roles=admin,member`).
 *
 * The component is uncontrolled: `defaultValues` is read from URL params.
 */
export function FilterCheckboxGroup({
  name,
  label,
  defaultValues = [],
  options,
}: {
  name: string;
  label: string;
  defaultValues?: string[];
  options: FilterCheckboxOption[];
}) {
  const serialized = defaultValues.join(",");

  return (
    <div className="flex flex-col gap-1">
      <span className={`${FONT_BOLD} ${TEXT_LABEL} uppercase`}>{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = defaultValues.includes(opt.value);
          return (
            // biome-ignore lint/a11y/noLabelWithoutControl: Base UI Checkbox.Root renders a hidden <input> as a descendant
            <label
              key={opt.value}
              className={`${FONT_REGULAR} text-[12px] flex items-center gap-1.5 cursor-pointer`}
              style={{ color: COLORS.textDark }}
            >
              <Checkbox.Root
                name={name}
                value={opt.value}
                defaultChecked={checked}
                className="size-[16px] rounded-[4px] border flex items-center justify-center"
                style={{
                  borderColor: checked ? COLORS.teal : COLORS.border,
                  backgroundColor: checked ? COLORS.teal : "white",
                }}
              >
                <Checkbox.Indicator>
                  <svg
                    width="10"
                    height="8"
                    viewBox="0 0 10 8"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Checkbox.Indicator>
              </Checkbox.Root>
              {opt.label}
            </label>
          );
        })}
      </div>
      {/* Hidden input carrying the comma-separated value for the GET form. */}
      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}
