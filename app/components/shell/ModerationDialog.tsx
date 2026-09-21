import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { useId, useState } from "react";

/**
 * What a moderation dialog asks for before an intent is submitted.
 *
 * Every part is optional, so one dialog covers "type the name to delete",
 * "ban for how long, and why" and "suspend, and also ban the team?".
 */
export interface DialogSpec {
  title: string;
  description: string;
  confirmLabel: string;
  /** A free-text field, submitted under `name` (default "reason"). */
  text?: {
    label: string;
    name?: string;
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
  };
  /** Offer a ban length, submitted as `duration`. */
  duration?: boolean;
  /** One opt-in checkbox, submitted as a boolean under `name`. */
  checkbox?: { name: string; label: string };
  /**
   * The exact string the operator must type to enable the confirm button.
   * Also submitted, under `confirmName`, for actions that re-check it.
   */
  confirmValue?: string;
}

const DURATIONS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "permanent", label: "Permanent" },
];

const INPUT =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

export function ModerationDialog({
  spec,
  open,
  onOpenChange,
  onSubmit,
  destructive,
}: {
  spec: DialogSpec;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, string | boolean>) => void;
  destructive?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [duration, setDuration] = useState("7");
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState("");

  const textOk = !spec.text?.required || text.trim() !== "";
  const confirmOk =
    spec.confirmValue === undefined || typed === spec.confirmValue;
  const canSubmit = textOk && confirmOk;

  function submit() {
    if (!canSubmit) return;
    const values: Record<string, string | boolean> = {};
    if (spec.text) values[spec.text.name ?? "reason"] = text.trim();
    if (spec.duration) values.duration = duration;
    if (spec.checkbox) values[spec.checkbox.name] = checked;
    if (spec.confirmValue !== undefined) values.confirmName = typed;
    onSubmit(values);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-md rounded-xl bg-white p-6 shadow-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {spec.title}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-600">
              {spec.description}
            </Dialog.Description>

            {spec.text ? (
              <label className="mt-4 block" htmlFor={`${id}-text`}>
                <span className="block text-sm font-medium text-gray-700">
                  {spec.text.label}
                  {spec.text.required ? "" : " (optional)"}
                </span>
                <textarea
                  id={`${id}-text`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={spec.text.placeholder}
                  maxLength={spec.text.maxLength ?? 500}
                  rows={3}
                  className={INPUT}
                />
              </label>
            ) : null}

            {spec.duration ? (
              <label className="mt-4 block" htmlFor={`${id}-duration`}>
                <span className="block text-sm font-medium text-gray-700">
                  Length
                </span>
                <select
                  id={`${id}-duration`}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={INPUT}
                >
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {spec.checkbox ? (
              <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="size-4 rounded border-gray-300 accent-teal-600"
                />
                {spec.checkbox.label}
              </label>
            ) : null}

            {spec.confirmValue !== undefined ? (
              <label className="mt-4 block" htmlFor={`${id}-confirm`}>
                <span className="block text-sm font-medium text-gray-700">
                  Type <span className="font-mono">{spec.confirmValue}</span> to
                  confirm
                </span>
                <input
                  id={`${id}-confirm`}
                  type="text"
                  autoComplete="off"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  aria-invalid={typed !== "" && !confirmOk}
                  className={INPUT}
                />
              </label>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close
                render={
                  <Button className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors" />
                }
              >
                Cancel
              </Dialog.Close>
              <Button
                type="submit"
                disabled={!canSubmit}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  destructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {spec.confirmLabel}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
