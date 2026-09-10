/**
 * Fails when the console's copy of the marketplace category matcher has drifted
 * from the tenant app's original.
 *
 * The console must classify a business exactly the way the customer's own page
 * does. A silent divergence would have the console reporting one category while
 * the public profile shows another, which is worse than not showing it at all.
 *
 * Set REVME_AI_PATH if the tenant app is not checked out beside this repo.
 */
import fs from "node:fs";
import path from "node:path";

const tenantRoot =
  process.env.REVME_AI_PATH ?? path.resolve(process.cwd(), "..", "revme-ai");
const source = path.join(tenantRoot, "src", "constants", "categories.ts");
const copy = path.resolve(
  process.cwd(),
  "app",
  "components",
  "data",
  "categories.ts",
);

if (!fs.existsSync(source)) {
  console.log(`skip: tenant app not found at ${source}`);
  console.log("      set REVME_AI_PATH to check for drift");
  process.exit(0);
}

const norm = (s) => s.replace(/\r\n/g, "\n").trimEnd();
const original = norm(fs.readFileSync(source, "utf8"));
const mirrored = norm(fs.readFileSync(copy, "utf8"));

// The copy is the original plus a header; strip everything before the first
// exported declaration and compare the rest byte for byte.
const marker = "export const MARKETPLACE_CATEGORIES";
const body = mirrored.slice(mirrored.indexOf(marker));

if (body === original.slice(original.indexOf(marker))) {
  console.log("ok: category matcher matches the tenant app");
  process.exit(0);
}

console.error("DRIFT: app/components/data/categories.ts no longer matches");
console.error(`       ${source}`);
console.error("       Re-copy it, or reconcile the two deliberately.");
process.exit(1);
