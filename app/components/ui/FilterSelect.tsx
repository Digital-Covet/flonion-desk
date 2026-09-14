import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import { COLORS, FONT_BOLD, FONT_REGULAR, TEXT_LABEL } from "../constants";

export interface FilterSelectOption {
  value: string;
  label: string;
}

/**
 * A styled select dropdown for GET form filters.
 *
 * Wraps Base UI Select so that filter bars get a consistent look. The
 * component is uncontrolled: `defaultValue` is read from the URL params
 * in the loader and passed down, keeping the URL as the source of truth.
 *
 * Select.Root renders hidden `<input>` elements with the given `name`,
 * so the native GET form picks up the value on submit without any extra
 * client-side wiring.
 */
export function FilterSelect({
  name,
  label,
  defaultValue = "",
  options,
  placeholder = "All",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: FilterSelectOption[];
  placeholder?: string;
}) {
  const labelId = `filter-label-${name}`;

  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <span id={labelId} className={`${FONT_BOLD} ${TEXT_LABEL} uppercase`}>
        {label}
      </span>
      <Select.Root name={name} defaultValue={defaultValue}>
        <Select.Trigger
          aria-labelledby={labelId}
          className="flex items-center justify-between gap-2 bg-white rounded-[10px] px-3 py-2 border outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          style={{ borderColor: COLORS.border }}
        >
          <Select.Value placeholder={placeholder} />
          <ChevronDown size={14} color={COLORS.textMuted} />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={4}>
            <Select.Popup className="select-popup">
              {placeholder ? (
                <Select.Item value="" className="select-item">
                  {placeholder}
                </Select.Item>
              ) : null}
              {options.map((opt) => (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className="select-item"
                >
                  {opt.label}
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

/**
 * A search input for filter bars, consistent with the FilterSelect visual
 * language. Wraps a plain `<input type="search">` so it participates in
 * the GET form without extra JS.
 */
export function SearchField({
  name = "q",
  defaultValue = "",
  placeholder = "Search...",
  label = "Search",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
      <span className={`${FONT_BOLD} ${TEXT_LABEL} uppercase`}>{label}</span>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`${FONT_REGULAR} text-[13px] text-[#2D3748] bg-white rounded-[10px] px-3 py-2 border outline-none w-full placeholder:text-[#A0AEC0] focus-visible:ring-2 focus-visible:ring-teal-400`}
        style={{ borderColor: COLORS.border }}
      />
    </label>
  );
}
