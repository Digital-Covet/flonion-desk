import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Toast } from "@base-ui/react/toast";
import { Tooltip } from "@base-ui/react/tooltip";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import {
  OperatorToastViewport,
  toastManager,
} from "./components/ui/OperatorToast";
import "./app.css";

export const links: Route.LinksFunction = () => [
  // Jost (font-sans) and Rubik (font-heading) are bundled through
  // @fontsource-variable and declared in app.css via @theme tokens, so we
  // don't need any third-party font CDN here.
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="isolate">
        {/*
          DirectionProvider keeps Base UI popups (tooltips, menus) positioned
          correctly; the tooltip provider gives them shared open timing so
          moving between triggers feels instant instead of re-delayed.
        */}
        <DirectionProvider>
          <Tooltip.Provider delay={300} timeout={300}>
            <Toast.Provider toastManager={toastManager}>
              {children}
              <OperatorToastViewport />
            </Toast.Provider>
          </Tooltip.Provider>
        </DirectionProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
