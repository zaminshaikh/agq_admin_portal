/**
 * @file sync-config.cjs
 * @description Copies the workspace-root `config.json` into `functions/`
 *              so that `tsc` can resolve the `import "../../config.json"`
 *              statements in the Cloud Functions source.
 *
 *              `config.json` is gitignored project-wide because it can
 *              contain secrets, so each developer keeps a copy at the
 *              workspace root (the rest of the codebase imports from
 *              there). This script bridges the gap so that running
 *              `npm install && npm run deploy` (or `npm run deploy:invite`
 *              from the root) just works without a manual file copy.
 *
 *              Wired up via the `prebuild` script in functions/package.json.
 */

const fs = require("fs");
const path = require("path");

const FUNCTIONS_DIR = path.resolve(__dirname, "..");
const ROOT_CONFIG = path.resolve(FUNCTIONS_DIR, "..", "config.json");
const FUNCTIONS_CONFIG = path.resolve(FUNCTIONS_DIR, "config.json");
const BUILT_CONFIG = path.resolve(FUNCTIONS_DIR, "lib", "config.json");

function tryCopy(src, dst, label) {
  try {
    fs.copyFileSync(src, dst);
    console.log(`[sync-config] copied ${label} -> ${path.relative(FUNCTIONS_DIR, dst)}`);
    return true;
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    return false;
  }
}

if (fs.existsSync(ROOT_CONFIG)) {
  tryCopy(ROOT_CONFIG, FUNCTIONS_CONFIG, "../config.json");
} else if (fs.existsSync(FUNCTIONS_CONFIG)) {
  console.log(
    "[sync-config] root config.json not found; using existing functions/config.json"
  );
} else if (fs.existsSync(BUILT_CONFIG)) {
  tryCopy(BUILT_CONFIG, FUNCTIONS_CONFIG, "lib/config.json");
} else {
  console.error(
    [
      "[sync-config] FATAL: no config.json found at any of:",
      `  - ${ROOT_CONFIG}`,
      `  - ${FUNCTIONS_CONFIG}`,
      `  - ${BUILT_CONFIG}`,
      "Create config.json at the workspace root before building.",
    ].join("\n")
  );
  process.exit(1);
}
