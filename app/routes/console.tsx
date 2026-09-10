import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import { requireOperatorRead } from "../prisma/operator";
import type { Route } from "./+types/console";

/**
 * The console shell: navigation on the left, the active section on the right.
 *
 * This was previously inlined in the overview route, which worked while there
 * was one screen. As a layout route the sidebar keeps its own state (the
 * mobile drawer, scroll position) across navigations, and every section
 * inherits the same frame without repeating it.
 *
 * It is also the one place a read is gated. Section loaders do not repeat the
 * check; when real sessions replace the token, this call and `operator.ts` are
 * the only things that change.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const operator = requireOperatorRead(request);
  return { operator: operator?.label ?? null };
}

export default function Console({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar />
      <Outlet context={{ operator: loaderData.operator }} />
    </div>
  );
}

/** What every section route can read out of the shell. */
export interface ConsoleContext {
  operator: string | null;
}
