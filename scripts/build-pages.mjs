// GitHub Pages serves static files only, so this build stages a copy of the app with the server
// surface removed (route handlers, middleware, header injection) and exports it under the
// project-site subpath that Pages assigns. The answer engine itself runs in the browser.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const project = join(dirname(fileURLToPath(import.meta.url)), "..");
const stage = join(project, "work", "pages-stage");
const out = join(project, "out");
const base = (process.env.BAZA_PAGES_BASE ?? "/baza-nisr").replace(/\/+$/, "");

const include = ["app", "components", "lib", "public", "hooks", "vendor", "package.json", "tsconfig.json", "postcss.config.mjs", "cloudflare-env.d.ts"];

rmSync(stage, { recursive: true, force: true });
rmSync(out, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const name of include) {
  const from = join(project, name);
  if (existsSync(from)) cpSync(from, join(stage, name), { recursive: true });
}

for (const blocked of ["app/api", "app/chatgpt-auth.ts", "middleware.ts"]) {
  rmSync(join(stage, blocked), { recursive: true, force: true });
}

symlinkSync(join(project, "node_modules"), join(stage, "node_modules"), process.platform === "win32" ? "junction" : "dir");

writeFileSync(join(stage, "next.config.ts"), `import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: ${JSON.stringify(base)},
  poweredByHeader: false,
};
export default config;
`);

const build = spawnSync(process.execPath, [join(project, "node_modules", "next", "dist", "bin", "next"), "build", "--webpack"], {
  cwd: stage,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_BAZA_STATIC: "1", NEXT_PUBLIC_BAZA_BASE: base, NEXT_TELEMETRY_DISABLED: "1" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const exported = join(stage, "out");
if (!existsSync(join(exported, "index.html"))) throw new Error(`Static export produced no index.html at ${exported}`);
cpSync(exported, out, { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");
console.log(`\nStatic export ready at ${out} for ${base}/`);
