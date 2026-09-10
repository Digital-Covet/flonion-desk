import { Separator } from "@base-ui/react/separator";

/**
 * Gradient hairline under the sidebar logo. The gradient can't be expressed
 * as a border, so the original SVG stays inside a Base UI Separator, which
 * contributes the role/orientation semantics without any visual change.
 */
export function SidebarDivider() {
  return (
    <Separator className="mx-4 mb-4">
      <svg aria-hidden="true" width="100%" height="1">
        <defs>
          <linearGradient id="divGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#E0E1E2" stopOpacity="0" />
            <stop offset="0.5" stopColor="#E0E1E2" />
            <stop offset="1" stopColor="#E0E1E2" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <line x1="0" y1="0.5" x2="100%" y2="0.5" stroke="url(#divGrad)" />
      </svg>
    </Separator>
  );
}
