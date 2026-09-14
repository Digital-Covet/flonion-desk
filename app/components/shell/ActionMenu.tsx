import { Menu } from "@base-ui/react/menu";
import { useFetcher } from "react-router";

/**
 * Row-level action menu triggered by a kebab or "..." button.
 *
 * Each item is a form submission via `useFetcher` so the action does not
 * navigate away from the list. The `intent` discriminator tells the route
 * action which mutation to perform.
 */
export function ActionMenu({
  items,
  disabled,
}: {
  items: Array<{
    label: string;
    intent: string;
    /** Extra data sent alongside the intent. */
    payload?: Record<string, string>;
    /** Destructive actions get a red style. */
    destructive?: boolean;
  }>;
  disabled?: boolean;
}) {
  const fetcher = useFetcher();

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
        <Menu.Positioner sideOffset={4} align="end">
          <Menu.Popup className="min-w-[160px] rounded-lg bg-white p-1 shadow-lg border border-gray-100 z-50">
            {items.map((item) => (
              <Menu.Item key={item.intent}>
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value={item.intent} />
                  {item.payload &&
                    Object.entries(item.payload).map(([key, value]) => (
                      <input key={key} type="hidden" name={key} value={value} />
                    ))}
                  <button
                    type="submit"
                    className={`w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors ${
                      item.destructive
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </button>
                </fetcher.Form>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
