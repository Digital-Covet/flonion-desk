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
 * The layout does not gate its children's data; each section loader gates
 * itself (see `console.tsx`). Login and the IAM's front-channel logout hook
 * sit outside the layout because they have no shell to render, and login must
 * be reachable before an operator has a session.
 *
 * Sections are added here as they are built. A nav row whose section has no
 * route yet stays inert rather than linking to a 404 — see `navLinks.ts`.
 */
export default [
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/auth/front-channel-logout", "routes/api.auth.front-channel-logout.ts"),
  route("login", "routes/login.tsx"),
  route("impersonate", "routes/impersonate.tsx"),
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
  ]),
] satisfies RouteConfig;
