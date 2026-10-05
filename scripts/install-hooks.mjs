// Runs on `npm install` (the "prepare" script). Points git at the committed .githooks folder.
// It does nothing outside a git checkout (for example in a Vercel build or a tarball install).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

if (process.env.CI || !existsSync(".git")) process.exit(0);

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" });
} catch {
  console.warn("install-hooks: could not set core.hooksPath; git hooks are not active");
}
