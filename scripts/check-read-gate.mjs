/**
 * Fails when any route serves loader data without an operator session.
 *
 * A layout loader cannot gate its children: React Router runs matched loaders
 * in parallel, and a single-fetch request (`/users.data?_routes=routes/users`)
 * runs only the loaders it names. So every loader must gate itself, and this
 * script proves it against the production build, for every route in the
 * manifest, including routes added later.
 *
 * Run after `react-router build` (or via `pnpm check:read-gate`). No database
 * is contacted: DATABASE_URL points at a closed local port, so the loaders' own
 * data reads cannot succeed. The gate must reject the request before any such
 * read runs.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Must be set before the build is imported: better-auth reads them lazily and
// `operator.ts` fails closed when they are missing.
process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "postgresql://gate:gate@127.0.0.1:1/gate";
process.env.BETTER_AUTH_URL = "http://desk.test";
process.env.BETTER_AUTH_SECRET = "gate-check-secret";
process.env.OAUTH_CLIENT_ID_DESK = "desk";
process.env.OAUTH_CLIENT_SECRET_DESK = "gate-check-client-secret";
delete process.env.OPERATOR_READ_OPEN;

// Gated loaders fail to reach the closed port by design; their logs are
// expected noise here.
const logError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("loader failed")) return;
  logError(...args);
};

/** Routes that are public on purpose. Anything else with a loader must gate. */
const PUBLIC_ROUTES = new Set([
  "root",
  "routes/login",
  "routes/api.auth.$",
  "routes/api.auth.front-channel-logout",
]);

const { createRequestHandler } = await import("react-router");
const build = await import(
  pathToFileURL(resolve("build/server/index.js")).href
);
const handler = createRequestHandler(build, "production");
const origin = "http://desk.test";

function fullPath(route) {
  const segments = [];
  for (let r = route; r; r = build.routes[r.parentId]) {
    if (r.path) segments.unshift(r.path);
  }
  const path = `/${segments.join("/")}`.replace(/:[^/]+/g, "gate-check");
  return path.replace(/\/+/g, "/");
}

function dataUrl(path, routeId) {
  // Single fetch spells the index URL `/_.data`.
  const base = path === "/" ? "/_.data" : `${path}.data`;
  return `${origin}${base}?_routes=${encodeURIComponent(routeId)}`;
}

const failures = [];
function expect(ok, message) {
  if (!ok) failures.push(message);
}

const gated = Object.values(build.routes).filter(
  (r) => r.module.loader && !PUBLIC_ROUTES.has(r.id),
);
expect(gated.length > 0, "no gated routes found in the build manifest");

for (const route of gated) {
  const path = fullPath(route);
  const url = dataUrl(path, route.id);

  const anon = await handler(new Request(url));
  const anonBody = await anon.text();

  // The console layout `return redirect("/login..."`; single fetch serializes
  // that as a 202 with a SingleFetchRedirect payload. Every section under it
  // must reject its own single-fetch data (403).
  const redirected =
    (anon.status === 302 && anon.headers.get("location")?.includes("/login")) ||
    (anonBody.includes("SingleFetchRedirect") && anonBody.includes("/login"));

  expect(
    anon.status === 403 || redirected,
    `${route.id}: ${url} without a session → ${anon.status}, want 403 or a login redirect`,
  );
  expect(
    !anonBody.includes("Database read failed"),
    `${route.id}: loader ran past the gate without a session`,
  );

  const doc = await handler(new Request(`${origin}${path}`));
  await doc.text();
  expect(
    doc.status === 403 || doc.status === 302,
    `${route.id}: GET ${path} without a session → ${doc.status}, want 403 or redirect`,
  );

  console.log(`checked ${route.id} (${path})`);
}

if (failures.length > 0) {
  console.error(`\nread gate check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`\nread gate holds for ${gated.length} routes`);
process.exit(0);