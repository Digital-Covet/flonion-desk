import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

/**
 * Every operator screen sits inside one layout route, so the sidebar is
 * mounted once and survives navigation between sections instead of being
 * rebuilt per page.
 *
 * Sections are added here as they are built. A nav row whose section has no
 * route yet stays inert rather than linking to a 404 — see `navLinks.ts`.
 */
export default [
  layout("routes/console.tsx", [
    index("routes/home.tsx"),
    route("businesses", "routes/businesses.tsx"),
    route("businesses/:id", "routes/business-detail.tsx"),
  ]),
] satisfies RouteConfig;
