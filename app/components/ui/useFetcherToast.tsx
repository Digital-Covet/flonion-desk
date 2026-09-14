import { useEffect, useRef } from "react";
import type { FetcherWithComponents } from "react-router";
import { toastManager } from "./OperatorToast";

/**
 * Shows a toast when a fetcher completes a successful mutation.
 *
 * Used in route components that POST actions (ban, delete, hide, etc.)
 * to give the operator visual feedback instead of a silent reload.
 *
 * The hook fires once per fetcher submission thanks to the `key` ref,
 * so it won't spam toasts during re-renders.
 */
export function useFetcherToast(
  fetcher: FetcherWithComponents<unknown>,
  {
    successTitle = "Action completed",
    successDescription,
    errorTitle = "Action failed",
  }: {
    successTitle?: string;
    successDescription?: string;
    errorTitle?: string;
  } = {},
) {
  const prevData = useRef(fetcher.data);

  useEffect(() => {
    if (prevData.current === fetcher.data) return;
    prevData.current = fetcher.data;

    if (fetcher.data && typeof fetcher.data === "object") {
      const data = fetcher.data as Record<string, unknown>;
      if (data.error) {
        toastManager.add({
          title: errorTitle,
          description: String(data.error),
          type: "error",
        });
      } else if (data.ok || data.redirect) {
        toastManager.add({
          title: successTitle,
          description: successDescription,
          type: "success",
        });
      }
    }
  }, [fetcher.data, successTitle, successDescription, errorTitle]);
}
