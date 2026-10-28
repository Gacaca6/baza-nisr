# Deployment

The project ships as a single Cloudflare Worker with static assets. There is no database, no queue, no KV namespace and no secret: the generated configuration reports `No bindings found`.

## Prerequisites

- Node.js `>=22.13.0`
- A Cloudflare account, authenticated with `npx wrangler login` (interactive browser sign-in — run it as the account owner, not inside an automated session)
- Nothing else. No provider keys are read at build or run time.

## Build

```sh
npm run install:ci
npm run build
```

This produces the deployable output under `dist/`:

- `dist/server/wrangler.json` — generated Worker configuration (`main: index.js`, `nodejs_compat`, `no_bundle`, assets at `../client`)
- `dist/server/` — Worker modules
- `dist/client/` — static assets served alongside the Worker

The generated config is disposable and gitignored; rebuild it whenever a binding or route changes rather than editing it by hand.

## Deploy to Cloudflare Workers

```sh
npx wrangler deploy --config dist/server/wrangler.json
```

Overrides you will probably want on the first deploy:

```sh
npx wrangler deploy \
  --config dist/server/wrangler.json \
  --name baza-nisr \
  --var ALLOWED_ORIGINS:https://embedder.example
```

`--var` is confirmed working against the generated config; it registers `ALLOWED_ORIGINS` as an environment variable readable by `process.env` in [lib/security.ts](../lib/security.ts). The value is not a secret — it is an allow-list of browser origins permitted to call the JSON endpoints. Leave it empty if only the embedded widget and same-origin visitors will call the API.

### Artifact size and plan choice — measure before you pick

The current build uploads **12,670 KiB raw / 4,452 KiB gzipped**. Of that, 11.7 MiB is the optional in-browser model chunk (`local-ai.worker-*.js` and its library chunk) being carried into the Worker bundle.

Cloudflare's documented Worker script limits are 3 MiB gzipped on the free plan and 10 MiB on the paid plan. Confirm against Cloudflare's current pricing page before committing, but on those numbers this artifact:

- **will not fit the free plan as built**
- **fits Workers Paid** ($5/month) with room to spare

Two honest options, in order of effort:

1. **Deploy as-is on Workers Paid.** No code change. The static assets themselves stay well inside asset limits.
2. **Drop the optional on-device model** from [components/local-model.tsx](../components/local-model.tsx) and [lib/local-ai.worker.ts](../lib/local-ai.worker.ts), leaving the verified-evidence product whole. On the current bundle that removes roughly 93% of the uploaded bytes, which should land under the free-plan limit — re-measure with `npx wrangler deploy --dry-run --config dist/server/wrangler.json` rather than trusting this estimate.

A third path, serving the model chunk as a static asset instead of a Worker module, would keep the feature and the free plan, but needs a build-config change in vinext that has not been validated here. Do not attempt it on submission day.

Check size any time, without authenticating or uploading:

```sh
npx wrangler deploy --dry-run --config dist/server/wrangler.json
```

## Preview the built artifact locally

```sh
npm start
```

Runs the built Worker through Wrangler on `127.0.0.1`, sharing local state with `npm run dev`. Use the URL it prints. This does not deploy anything.

## Deploy with Docker (any container host)

```sh
docker build -t baza-nisr .
docker run --rm -p 3000:3000 -e ALLOWED_ORIGINS= baza-nisr
```

The image builds the Next.js standalone server, runs as `node`, exposes 3000 and health-checks `/api/health`. Use this path when Workers size limits or plan cost are the constraint; the application code is identical.

## Verify a deployment before sharing the URL

Run each of these against the live host. The competition requires a publicly reachable URL, so check from a clean browser or a private window with no sign-in session.

```sh
curl -s https://<host>/api/health
curl -s -X POST https://<host>/api/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is the poverty rate in Rwanda?","language":"en","history":[]}'
```

Expected: `status:"ok"`, `version` matching `lib/evidence.ts`, `paidServicesRequired:false`, and a chat response with `status:"supported"`, value `27.4`, and a `sourceUrl` on `statistics.gov.rw` with a page anchor.

Then in the browser:

1. Ask one question in each of the three languages; confirm the value, period and source are identical.
2. Use a follow-up ("And in rural areas?") and the language-switch button.
3. Request a district value and a quarter; confirm refusal with no rows.
4. Open the cited PDF link and check the number appears in the named table on the named page.
5. Download the CSV from the Explore screen; confirm values and provenance match the screen.
6. Open `/embed` inside a page on a **different origin** — the integration guide has the test snippet.
7. Repeat on a phone viewport, and once with the keyboard only (Tab through the composer, Escape out of the model dialog).

## Operating notes for handover

- **Updating data** means editing `lib/evidence.ts`, bumping `VERSION`, and re-running `npm test && npm run eval`. There is no ingest pipeline to re-run and no database to migrate.
- **Rolling back** means redeploying the previous commit's build. Because the collection is code, the deployed version always matches a commit.
- **Costs** are hosting plus visitor bandwidth. The answer path makes zero model or network calls per question. The optional on-device model transfers roughly 1–2 GB from Hugging Face/MLC hosting to the visitor's browser, on the visitor's connection, only after they click enable.
- **Rate limiting** is per Worker isolate ([lib/security.ts](../lib/security.ts)). It is adequate for a prototype; a public rollout needs Cloudflare-level or platform-level limits. The limiter is best-effort and resets on cold start.
- **Abuse surface** is bounded: request bodies capped at 16 KiB, messages at 2,000 characters, six history entries max, unknown JSON fields rejected, cross-origin requests denied unless allow-listed, CSP and `frame-ancestors` set by [middleware.ts](../middleware.ts), and CSV cells defanged against formula injection.
- **Nothing persists.** No conversation storage, no user accounts, no cookies set by the application.
