import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import { useState } from "react";

/**
 * Confirmation dialog that requires typing a value before proceeding.
 *
 * Used for destructive actions (delete business, ban user) where the operator
 * must explicitly confirm by typing the entity name.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmValue,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  /** The exact string the operator must type to enable the confirm button. */
  confirmValue: string;
  onConfirm: () => void;
  /** The trigger element (usually a button). */
  children: React.ReactNode;
}) {
  const [input, setInput] = useState("");

  return (
    <Dialog.Root>
      <Dialog.Trigger render={<span>{children}</span>} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-gray-900">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-600">
            {description}
          </Dialog.Description>

          <Field.Root
            name="confirm-input"
            className="mt-4"
            invalid={input !== "" && input !== confirmValue}
          >
            <Field.Label className="block text-sm font-medium text-gray-700">
              Type <span className="font-mono">{confirmValue}</span> to confirm
            </Field.Label>
            <Field.Control
              type="text"
              value={input}
              onValueChange={(val) => setInput(val)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </Field.Root>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close
              render={
                <Button className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors" />
              }
            >
              Cancel
            </Dialog.Close>
            <Dialog.Close
              render={
                <Button
                  disabled={input !== confirmValue}
                  onClick={() => {
                    if (input === confirmValue) onConfirm();
                  }}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              }
            >
              {confirmLabel}
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
