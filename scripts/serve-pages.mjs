// Serve the GitHub Pages artifact locally, under the same subpath Pages assigns, so links and
// the widget can be checked before publishing. Node only; no dependencies.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const base = (process.env.BAZA_PAGES_BASE ?? "/baza-nisr").replace(/\/+$/, "");
const port = Number(process.env.PORT ?? 8788);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

if (!existsSync(join(root, "index.html"))) throw new Error(`No export at ${root}. Run npm run build:pages first.`);

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (path === "/" || !path.startsWith(`${base}/`)) {
    response.writeHead(404, { "content-type": types[".html"] }).end(`<p>Not under <code>${base}/</code>. Open <a href="${base}/">${base}/</a>.</p>`);
    return;
  }
  const target = join(root, path.slice(base.length).replace(/^\/+/, ""));
  const file = [target, join(target, "index.html")].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  if (!file) {
    const missing = join(root, "404.html");
    response.writeHead(404, { "content-type": types[".html"] }).end(existsSync(missing) ? readFileSync(missing) : "Not found");
    return;
  }
  response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}${base}/ -> ${root}`));
