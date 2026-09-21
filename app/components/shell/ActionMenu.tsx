import { Button } from "@base-ui/react/button";
import { Menu } from "@base-ui/react/menu";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useFetcherToast } from "../ui/useFetcherToast";
import { type DialogSpec, ModerationDialog } from "./ModerationDialog";

export type ActionValue = string | number | boolean;

export interface ActionItem {
  label: string;
  intent: string;
  /** Extra data sent alongside the intent (the entity id, a status, …). */
  payload?: Record<string, ActionValue>;
  /** Destructive actions get a red style. */
  destructive?: boolean;
  /**
   * Route whose action handles this intent, when it is not the current page's.
   * "Ban reviewer" on Reviews posts to `/users`, for instance.
   */
  action?: string;
  /** Ask for a reason, a ban length or a typed confirmation first. */
  dialog?: DialogSpec;
  /** Leave the item out, so callers can list conditional items inline. */
  hidden?: boolean;
}

/**
 * Submits moderation intents and reports the outcome.
 *
 * Everything posts JSON, which is what every route action reads. One fetcher
 * per menu keeps a row's pending state its own, and the toast is titled after
 * the item that ran so two rows' results cannot be confused.
 */
function useActionRunner() {
  const fetcher = useFetcher();
  const [last, setLast] = useState<ActionItem | null>(null);
  const [open, setOpen] = useState<ActionItem | null>(null);

  const title = last?.label.replace(/…$/, "") ?? "Action";
  useFetcherToast(fetcher, {
    successTitle: `${title}: done`,
    errorTitle: `${title}: failed`,
  });

  function submit(item: ActionItem, extra: Record<string, ActionValue> = {}) {
    setLast(item);
    fetcher.submit(
      { intent: item.intent, ...item.payload, ...extra },
      {
        method: "post",
        encType: "application/json",
        ...(item.action ? { action: item.action } : {}),
      },
    );
  }

  function run(item: ActionItem) {
    if (item.dialog) setOpen(item);
    else submit(item);
  }

  const dialog = open?.dialog ? (
    <ModerationDialog
      spec={open.dialog}
      destructive={open.destructive}
      open
      onOpenChange={(next) => {
        if (!next) setOpen(null);
      }}
      onSubmit={(values) => {
        submit(open, values);
        setOpen(null);
      }}
    />
  ) : null;

  return { run, dialog, busy: fetcher.state !== "idle" };
}

/**
 * Row-level action menu triggered by a kebab button.
 */
export function ActionMenu({
  items,
  disabled,
  label = "Actions",
}: {
  items: ActionItem[];
  disabled?: boolean;
  /** Accessible name for the trigger, e.g. "Actions for Acme". */
  label?: string;
}) {
  const { run, dialog, busy } = useActionRunner();
  const visible = items.filter((i) => !i.hidden);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          disabled={disabled || busy || visible.length === 0}
          aria-label={label}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="8" cy="3" r="1.5" fill="currentColor" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            <circle cx="8" cy="13" r="1.5" fill="currentColor" />
          </svg>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end" className="z-50">
            <Menu.Popup className="min-w-[180px] rounded-lg bg-white p-1 shadow-lg border border-gray-100">
              {visible.map((item) => (
                <Menu.Item
                  key={item.intent + (item.action ?? "")}
                  onClick={() => run(item)}
                  className={`block w-full cursor-default text-left rounded-md px-3 py-1.5 text-sm outline-none transition-colors ${
                    item.destructive
                      ? "text-red-600 data-[highlighted]:bg-red-50"
                      : "text-gray-700 data-[highlighted]:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {dialog}
    </>
  );
}

/**
 * The same actions as a row of buttons, for a detail page's toolbar.
 */
export function ActionButtons({ items }: { items: ActionItem[] }) {
  const { run, dialog, busy } = useActionRunner();

  return (
    <div className="flex flex-wrap gap-2">
      {items
        .filter((i) => !i.hidden)
        .map((item) => (
          <Button
            key={item.intent + (item.action ?? "")}
            disabled={busy}
            onClick={() => run(item)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              item.destructive
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {item.label}
          </Button>
        ))}
      {dialog}
    </div>
  );
}
