import { useOutletContext } from "react-router";
import Dashboard from "../components/Dashboard";
import { loadOverview } from "../prisma/overview";
import type { Route } from "./+types/home";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Overview" },
    {
      name: "description",
      content:
        "Internal operations console for the Flonion platform: account, review and AI usage across every customer.",
    },
  ];
}

/**
 * The only place `db` reaches this route. A failed read is reported to the
 * panel rather than thrown, so a database outage costs the operator the
 * figures, not the whole screen.
 */
export async function loader() {
  try {
    return { data: await loadOverview(), error: null };
  } catch (cause) {
    console.error("overview loader failed", cause);
    return {
      data: null,
      error: cause instanceof Error ? cause.message : "Unknown database error",
    };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { data, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <>
      {/*
        Page-level landmark for assistive tech; visually hidden so the
        Dashboard's own card titles remain the only headings on screen.
      */}
      <h1 className="sr-only font-heading">Overview</h1>
      <Dashboard data={data} error={error} operator={operator} />
    </>
  );
}
