# Deployment

One codebase, two published shapes.

| Shape | Command | What it serves | What it costs |
| --- | --- | --- | --- |
| **GitHub Pages static site** — what is live now | `npm run build:pages` → `out/` | the whole interface, the widget and `/embed`, with the answer engine running in the visitor's browser | free |
| **Server build** — self-hosted, when the API is needed | `npm run build:node`, or `docker build`, or `npm run build` for a Worker | the same interface **plus** `POST /api/v1/*`, live NISR catalogue search and response headers | a container host, or a Worker plan |

Both shapes call the same [lib/answer.ts](../lib/answer.ts) over the same pinned evidence, so a figure, a period and a citation cannot differ between them.

## Publish to GitHub Pages

### One-time setup

1. Push the repository to GitHub. Pages on a project site needs the repository public for anyone to read it.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.** The workflow [deploy-pages.yml](../.github/workflows/deploy-pages.yml) builds and uploads the artifact; if the source is still set to "Deploy from a branch", the deploy job fails with a message about the source type.

After that, every push to `main` verifies the project (typecheck, 70 tests, 150 evaluations) and publishes. Nothing else to configure, no secret to store, no key to rotate.

### Build and check it locally

```sh
npm run build:pages    # static export in out/, written for the /baza-nisr/ subpath
npm run start:pages    # http://127.0.0.1:8788/baza-nisr/ and /baza-nisr/widget-host.html
```

A project site is served from a subpath, so the export is built with `basePath` set to that subpath. If the repository is not named `baza-nisr`, say so at build time; the workflow already reads the name from GitHub:

```sh
BAZA_PAGES_BASE=/other-repo-name npm run build:pages
```

### What the Pages build changes, and why

[scripts/build-pages.mjs](../scripts/build-pages.mjs) stages a copy of the app, removes the server surface, and exports it. Four deliberate consequences:

- **No route handlers.** `app/api/**`, `app/chatgpt-auth.ts` and `middleware.ts` are deleted in the stage, because `output: "export"` cannot publish a `POST`. With `NEXT_PUBLIC_BAZA_STATIC=1` the composer calls `buildAnswer()` in the browser instead — the same function the API wraps, with the same three-turn history — so the interface never probes an endpoint that is not there. The generated snippets in the Integrate view point at files that do exist: `/widget.js`, `/embed/`, `/openapi.json`.
- **No live catalogue search.** NISR's MCP endpoint sends no `Access-Control-Allow-Origin`, so a browser `POST` from another origin is refused at the preflight before our code runs. This is not something a static host can route around; the Sources view therefore shows the approved publication list, says the catalogue is unavailable in this build, and the API contract stays in [INTEGRATION.md](INTEGRATION.md) for server builds.
- **No middleware headers.** CSP, `frame-ancestors` and `no-store` come from [middleware.ts](../middleware.ts), which does not exist on Pages. The static page makes no data-bearing request to frame or cache — its own assets are ordinary same-origin file reads — but a hardened deployment should use the server build, where those headers are set and tested.
- **No size pressure from the optional model.** The 6.1 MB WebLLM library is emitted as a lazy client chunk; it downloads only when a visitor presses "On-device AI" and confirms.

The artifact is ~7.4 MB of files, of which that one lazy chunk is most of the bytes. GitHub's limits (1 GB site, 100 GB/month transfer) are not in play for a hackathon demo.

### Verify the published site

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://<user>.github.io/<repo>/
curl -s -o /dev/null -w '%{http_code}\n' https://<user>.github.io/<repo>/embed/
curl -s -o /dev/null -w '%{http_code}\n' https://<user>.github.io/<repo>/widget.js
```

All three must be `200`, and the served HTML must reference `/<repo>/_next/…`. Then in the browser, on a phone viewport as well as a desktop one:

1. Ask one question in each of the three languages; confirm the value, period and source are identical and the decimal separator follows the language (`27.4%` in English, `27,4%` in French).
2. Use a follow-up ("And in rural areas?") and the language-switch button.
3. Request a district value and a quarter; confirm refusal with no rows.
4. Open the cited PDF link and check the number appears in the named table on the named page.
5. Download the CSV from the Explore screen; confirm values and provenance match the screen.
6. Open `/embed/` inside a page on a **different origin** — [INTEGRATION.md](INTEGRATION.md) has the test snippet.
7. Tab through the composer and Escape out of the model dialog.

`/api/health` is not part of this deployment. Where a server build is used, check it too:

```sh
curl -s https://<host>/api/health
curl -s -X POST https://<host>/api/v1/chat -H 'Content-Type: application/json' \
  -d '{"message":"What is the poverty rate in Rwanda?","language":"en","history":[]}'
```

Expected: `status:"ok"`, `version` matching `lib/evidence.ts`, `paidServicesRequired:false`, and a chat response with `status:"supported"`, value `27.4`, and a `sourceUrl` on `statistics.gov.rw` with a page anchor.

## Self-host with the API

### Node or Docker (recommended when the API matters)

```sh
npm ci && npm run build:node
ALLOWED_ORIGINS= node .next/standalone/server.js     # http://localhost:3000
```

or

```sh
docker build -t baza-nisr .
docker run --rm -p 3000:3000 -e ALLOWED_ORIGINS= baza-nisr
```

Measured on the current tree: `.next/server` is **2.3 MB**, and the on-device model chunks appear only under `.next/static` (client). Keeping [components/local-model.tsx](../components/local-model.tsx) out of the server graph is why — it is loaded with `next/dynamic` and `ssr: false`, so no build that runs the server needs 12 MB of inference code.

### Cloudflare Worker (kept, not the free-tier path)

```sh
npm run build
npx wrangler deploy --config dist/server/wrangler.json --name baza-nisr --var ALLOWED_ORIGINS:
```

`npm run build` runs vinext, and vinext still copies the client chunks into `dist/server/ssr/_next/static/`: the Worker bundle is **13 MB**, of which 6.1 MB is `local-ai.worker-*.js` and 5.9 MB is the WebLLM library chunk. Cloudflare's documented Worker script limits are 3 MB gzipped on the free plan and 10 MB on the paid plan, so this artifact does not belong on a free Worker; it is also why GitHub Pages is the published target. Check any time without uploading:

```sh
npx wrangler deploy --dry-run --config dist/server/wrangler.json
```

`--var ALLOWED_ORIGINS` is not a secret — it is an allow-list of browser origins permitted to call the JSON endpoints ([lib/security.ts](../lib/security.ts)). Leave it empty if only the widget and same-origin visitors call the API. Serving the model chunk as an asset instead of a Worker module would keep both the feature and the free plan, but needs a vinext build-config change that has not been validated here; do not attempt it on submission day.

### Preview the built Worker locally

```sh
npm start
```

Runs the built Worker through Wrangler on `127.0.0.1`, sharing local state with `npm run dev`. This deploys nothing.

## Operating notes for handover

- **Updating data** means editing [lib/evidence.ts](../lib/evidence.ts), bumping `VERSION`, and re-running `npm test && npm run eval`. There is no ingest pipeline to re-run and no database to migrate.
- **Rolling back** a Pages deployment: Actions keeps every artifact, so redeploying an earlier run from the workflow page restores it; otherwise rebuild the previous commit. Because the collection is code, the deployed version always matches a commit.
- **Costs** are hosting plus visitor bandwidth. The answer path makes zero model or network calls per question. The optional on-device model transfers roughly 1–2 GB from MLC's hosting to the visitor's browser, on the visitor's connection, only after they click enable.
- **Rate limiting** exists only in the server build, and only per process or isolate ([lib/security.ts](../lib/security.ts)). A static Pages deployment has no limiter because there is no request to limit; a public rollout of the API needs edge-level limits.
- **Abuse surface** is bounded in the server build: bodies capped at 16 KiB, messages at 2,000 characters, six history entries max, unknown JSON fields rejected, cross-origin requests denied unless allow-listed, CSP and `frame-ancestors` set by [middleware.ts](../middleware.ts), CSV cells defanged against formula injection. In the Pages build the same limits are irrelevant — there is no endpoint — and the document fetch allow-list (`*.statistics.gov.rw`) still applies wherever the catalogue code runs.
- **Nothing persists.** No conversation storage, no user accounts, no cookies set by the application.
