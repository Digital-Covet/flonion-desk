import { Toast } from "@base-ui/react/toast";

/**
 * Global toast manager instance. Created once at module scope and shared
 * across the app so any module (hooks, route components) can queue toasts
 * without being inside the React tree.
 */
export const toastManager = Toast.createToastManager();

/**
 * A single toast notification rendered inside the viewport.
 *
 * Each toast carries a `data-type` attribute set by Base UI, which
 * drives the left-border colour via `.toast-root[data-type=...]` in app.css.
 */
function ToastItem({ toast }: { toast: Toast.Root.ToastObject }) {
  return (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="toast-root"
      data-type={toast.type}
    >
      <Toast.Content className="flex flex-col gap-0.5 flex-1 min-w-0">
        <Toast.Title className="text-sm font-semibold text-[#2D3748]">
          {toast.title}
        </Toast.Title>
        {toast.description ? (
          <Toast.Description className="text-xs text-gray-500 leading-snug">
            {toast.description}
          </Toast.Description>
        ) : null}
      </Toast.Content>
      <Toast.Close className="icon-button" aria-label="Dismiss notification">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
            stroke="#A0AEC0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </Toast.Close>
    </Toast.Root>
  );
}

/**
 * Global toast viewport. Mount once in root.tsx.
 * Reads toasts from the global manager and renders each one.
 */
export function OperatorToastViewport() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className="toast-viewport">
        {toasts.map((t: Toast.Root.ToastObject) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export { Toast };
