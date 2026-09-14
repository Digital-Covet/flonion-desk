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
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("login", "routes/login.tsx"),
  layout("routes/console.tsx", [
    index("routes/home.tsx"),
    route("businesses", "routes/businesses.tsx"),
    route("businesses/:id", "routes/business-detail.tsx"),
    route("users", "routes/users.tsx"),
    route("users/:id", "routes/user-detail.tsx"),
    route("reviews", "routes/reviews.tsx"),
    route("meetings", "routes/meetings.tsx"),
    route("marketplace", "routes/marketplace.tsx"),
    route("ai-usage", "routes/ai-usage.tsx"),
    route("support", "routes/support.tsx"),
    route("audit", "routes/audit.tsx"),
    route("console/unlock", "routes/console.unlock.tsx"),
    route("impersonate", "routes/impersonate.tsx"),
  ]),
] satisfies RouteConfig;
