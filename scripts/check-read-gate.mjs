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
 * is contacted: DATABASE_URL points at a closed local port.
 */
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Must be set before the build is imported: operator.ts reads them at load.
const token = randomBytes(32).toString("base64url");
process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "postgresql://gate:gate@127.0.0.1:1/gate";
process.env.DESK_OPERATOR_TOKENS = `gate-check=${token}`;
delete process.env.OPERATOR_READ_OPEN;

// Authenticated loaders fail to reach the closed port by design; their logs
// are expected noise here.
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
  "routes/console.unlock",
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

// Unlock: a token in the URL is refused; a POSTed one yields a session cookie.
{
  const res = await handler(
    new Request(`${origin}/console/unlock?token=${token}`),
  );
  expect(
    res.status === 400,
    `GET /console/unlock?token= → ${res.status}, want 400`,
  );
}

const unlock = await handler(
  new Request(`${origin}/console/unlock`, {
    method: "POST",
    body: new URLSearchParams({ token }),
  }),
);
const setCookie = unlock.headers.get("set-cookie") ?? "";
const cookie = setCookie.split(";")[0];
expect(
  unlock.status === 302 && cookie.startsWith("desk_operator="),
  `POST /console/unlock → ${unlock.status}, no session cookie`,
);
expect(
  !setCookie.includes(encodeURIComponent(token)) && !setCookie.includes(token),
  "session cookie contains the raw token",
);

const gated = Object.values(build.routes).filter(
  (r) => r.module.loader && !PUBLIC_ROUTES.has(r.id),
);
expect(gated.length > 0, "no gated routes found in the build manifest");

for (const route of gated) {
  const path = fullPath(route);
  const url = dataUrl(path, route.id);

  const anon = await handler(new Request(url));
  const anonBody = await anon.text();
  expect(
    anon.status === 403,
    `${route.id}: ${url} without a session → ${anon.status}, want 403`,
  );
  expect(
    !anonBody.includes("Database read failed"),
    `${route.id}: loader ran past the gate without a session`,
  );

  const doc = await handler(new Request(`${origin}${path}`));
  await doc.text();
  expect(
    doc.status === 403,
    `${route.id}: GET ${path} without a session → ${doc.status}, want 403`,
  );

  // Positive control: with a session the loader runs, so the 403s above are
  // the gate and not something else failing.
  const authed = await handler(new Request(url, { headers: { cookie } }));
  const authedBody = await authed.text();
  expect(
    authed.status === 200,
    `${route.id}: ${url} with a session → ${authed.status}, want 200`,
  );
  expect(
    !/ECONNREFUSED|contract marker/i.test(authedBody),
    `${route.id}: raw database error reached the client`,
  );

  console.log(`checked ${route.id} (${path})`);
}

if (failures.length > 0) {
  console.error(`\nread gate check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`\nread gate holds for ${gated.length} routes`);
process.exit(0);
