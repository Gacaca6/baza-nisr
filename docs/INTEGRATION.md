# Integrating Baza NISR

Three surfaces, one evidence engine behind each. Pick by how much of the UI you want to own.

| Surface | You get | You host | Needs `ALLOWED_ORIGINS` |
| --- | --- | --- | --- |
| `widget.js` | A floating button that opens the assistant in a shadow-DOM panel | Nothing but the script tag | No |
| `/embed` | The full compact chat as an iframe you size yourself | The iframe and its layout | No |
| `/api/v1/*` | JSON answers, evidence rows, sources and calculations | The entire interface | Yes, for browser clients |

All three ask the same engine — [lib/answer.ts](../lib/answer.ts), called in the browser on the static Pages site and through `POST /api/v1/chat` on a server build — so a figure, a period and a citation cannot differ between them. Machine-readable contract: [public/openapi.json](../public/openapi.json).

The hosted demo at `https://<user>.github.io/baza-nisr/` is the static build: sections 1 and 2 work there as published. Section 3 does not — Pages serves files, so the `/api/v1/*` routes and the live catalogue search only exist in a server build (`npm run build:node`, Docker or the Cloudflare Worker).

## 1. Website widget

One tag before `</body>`:

```html
<script src="https://<user>.github.io/baza-nisr/widget.js"
        data-language="rw"></script>
```

Behaviour, as implemented in [public/widget.js](../public/widget.js):

- `data-language` — `en`, `rw` or `fr`. Anything else falls back to `en`. It sets only the initial interface language; the visitor can still switch with the RW / EN / FR control.
- `data-baza-url` — where the assistant lives. Defaults to the URL `widget.js` itself was loaded from, and is rejected unless it parses as `http:` or `https:`. Omit it on Pages: the loader keeps the directory it was served from, so `/baza-nisr/widget.js` opens `/baza-nisr/embed/`.
- The iframe is created on first open, not on page load, so the ~1–2 GB on-device model chunk is never pulled into a page that only shows the button.
- Panel markup lives in a shadow root with its own styles; the host page's CSS cannot bleed in and the widget's CSS cannot leak out.
- The iframe is sandboxed: `allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox`. No `allow-forms`, no `allow-top-navigation`.
- `Escape` closes the panel, and closing returns focus to the button.
- A second `<script>` tag on the same page is ignored — the loader refuses to mount twice.

Requests inside the panel originate from the Baza iframe, i.e. from the Baza origin itself, so they are same-origin and need no cross-origin configuration. That is the whole reason the widget exists rather than a browser-side fetch from the host page. On the Pages build the panel needs no network call at all for an answer — [lib/answer.ts](../lib/answer.ts) runs inside the iframe.

### Widget preview before you ship it

The **Integrate** view (`/?view=integrate`) renders the live snippet against your current origin and a working preview iframe beside it. Copy from there rather than retyping.

## 2. Direct iframe

```html
<iframe src="https://<user>.github.io/baza-nisr/embed/?lang=fr"
        title="Baza NISR"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox">
</iframe>
```

`/embed` is [app/embed/page.tsx](../app/embed/page.tsx) — the same `<BazaApp embedded>` used in the widget. `embedded` drops the NISR-styled masthead, utility bar and side navigation, keeps the language switch, and adds a "new conversation" control that the standalone app has in its sidebar.

On Pages, keep the trailing slash (`/baza-nisr/embed/`): the export is a directory of `index.html` files, and Pages serves the slash form. On a server build both `/embed` and `/embed/` work.

Query parameters (read once on mount, then kept in the URL by `history.replaceState`):

| Parameter | Values | Notes |
| --- | --- | --- |
| `lang` | `en` · `rw` · `fr` | Invalid values are ignored; default `en` |
| `view` | `ask` · `explore` · `sources` · `integrate` · `present` | `ask` is the chat surface |

Embedding is permitted by `frame-ancestors https:` on `/embed` ([lib/response-headers.ts](../lib/response-headers.ts)) — any HTTPS site. The rest of the app is `frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com https://*.chatgpt.site`, so the full app cannot be framed by an arbitrary site. Those headers come from [middleware.ts](../middleware.ts), which Pages does not run: the hosted Pages surface has no framing restriction on any path. If you deploy behind plain HTTP for a demo, note that `http://` origins other than `localhost` / `127.0.0.1` are refused framing; serve `/embed` over HTTPS.

Minimum sensible height is roughly 480 px; the panel in the widget uses `min(420px, 100vw − 32px)` × `min(680px, 100dvh − 120px)` and works down to a 320 px-wide phone.

## 3. JSON API

Server builds only — Pages has no `/api/v1` routes; use the widget or the iframe there.

Base path `/api/v1`. Content type `application/json` only.

### `POST /api/v1/chat`

```json
{ "message": "Ubukene bungana hate mu Rwanda?", "language": "rw", "history": [] }
```

| Field | Rules | Notes |
| --- | --- | --- |
| `message` | required, trimmed, 1–2000 chars | The question, in the visitor's words |
| `language` | optional, `en` \| `rw` \| `fr`, default `en` | Also switches on phrases inside the message ("answer in French") |
| `history` | optional, ≤6 items, default `[]` | `{role:"user"\|"assistant", content: ≤3000 chars}`, strict objects |

Unknown fields are rejected — the schema is `.strict()`. `history` is how follow-ups resolve: the app sends the last three turns, using the engine's own `resolvedQuestion` for the user side when there is one, so "and in rural areas?" resolves to the earlier indicator.

Response (`200`), shape defined in [lib/domain.ts](../lib/domain.ts):

```json
{
  "requestId": "…",
  "language": "rw",
  "status": "supported",
  "mode": "verified-evidence",
  "operation": "compare",
  "title": "…",
  "answer": "…",
  "coverage": "…",
  "rows": [{ "id": "poverty-2024-Rwanda", "indicator": "poverty", "value": 27.4, "unit": "%",
             "period": "2023/24", "year": 2024, "geography": "Rwanda", "group": "All",
             "population": "…", "sourceId": "eicv7", "sourceUrl": "https://…",
             "pdfPage": 81, "locator": "Table 9.1 · printed p.79", "method": "EICV7-monetary",
             "estimate": "survey", "ci": [26.4, 28.3] }],
  "sources": [{ "id": "eicv7", "title": "…", "url": "…", "pdf": "…",
                "sha256": "…", "retrievedAt": "…", "methodology": { "en": "…", "rw": "…", "fr": "…" } }],
  "notes": ["…"],
  "suggestions": ["…"],
  "calculation": { "value": -12.4, "unit": "percentage points",
                   "formula": "27.4 − 39.8 = -12.4",
                   "inputIds": ["poverty-2017-Rwanda-modelled", "poverty-2024-Rwanda"] }
}
```

`rows` here is abbreviated to one entry — this comparison returns both the 2016/17 modelled baseline and the 2023/24 survey estimate. `id` values are stable across releases, so you can cache or assert on them.

Read `status` before rendering:

| `status` | Meaning | `rows` | Your UI should |
| --- | --- | --- | --- |
| `supported` | The question is answered from verified evidence | usually non-empty; empty for `operation: "definition"` | Show `answer`, the table, and the source links |
| `clarification` | The question is ambiguous | empty | Show the question back plus `suggestions` |
| `unavailable` | Out of collection scope | empty | Show the refusal as the answer — do not paraphrase it into a number |
| `discovery` | Catalogue/metadata intent | empty | Link to the publication, say no figure was returned |

Three invariants worth asserting in your own tests, because the engine enforces them and the evaluation suite measures them:

1. `status: "unavailable"`, `"clarification"` and `"discovery"` always arrive with `rows: []` and no `calculation`.
2. Every `rows[].value` exists in the published collection, and every `rows[].sourceUrl` is an `https://*.statistics.gov.rw` document.
3. No percentage appears in `answer` that is not one of that response's own `rows[].value` or its `calculation.value`.

Treat `calculation` as the arithmetic output, not as prose: `formula` and `inputIds` tell you exactly which two displayed values produced it. Comparisons use rounded displayed values, so a published change may differ in the third decimal — keep `notes` visible.

### Other endpoints

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/api/health` | GET | `status`, collection `version`, source/observation counts, `paidServicesRequired`, `localModel`. Safe to probe; exposes no configuration |
| `/api/v1/sources` | GET | The two indexed publications with `sha256` and `retrievedAt`. `Cache-Control: public, max-age=300` |
| `/api/v1/observations` | GET | The full collection; `?indicator=` filters to one of the seven. Bad indicator → `400 UNKNOWN_INDICATOR` |
| `/api/v1/catalog` | POST | `{query: 2–160 chars, language?}` → live NISR MCP results or local fallback |

`/api/v1/catalog` returns `mode: "live" | "fallback"`. In fallback you are seeing the two approved publications, not the catalogue — say so in your UI, and show `reason`, which the response carries whenever the live call failed (`Catalogue HTTP 500`, `Catalogue timed out after 8 seconds`, `Catalogue redirected the request`) rather than swallowing the cause.

`items[].id` is the record's **DDI idno**, for example `RWA_NISR_DOC_2024_LFS-MN_EN_V1`. It is citable even when no link is, so render it. `url` is non-null only when the catalogue's own URL already points at an `https://*.statistics.gov.rw` page; `linkVerified` mirrors that decision. Most NISR records are published through the NADA central repository, and its record ids do not correspond to ids on NISR's microdata bank, so those links are withheld instead of rewritten to a page we cannot verify — point the reader at NISR's catalogue root and the idno instead. Never render a guessed link.

### Server-side client

```sh
curl -sS https://<baza-origin>/api/v1/chat \
  -H 'Content-Type: application/json' \
  --data-binary @- <<'JSON'
{"message":"What was youth unemployment in 2025?","language":"en","history":[]}
JSON
```

No key, no token. Requests with no `Origin` header are treated as server-to-server or same-origin.

## 4. Cross-origin browser calls

Only relevant to a server build: on Pages there is no API route for a browser to call cross-origin, and the widget and `/embed` need no configuration on either host.

`/api/v1/*` rejects a browser `POST` from an origin the operator has not named. Configure exact origins, comma-separated, at deploy time:

```sh
npx wrangler deploy --var ALLOWED_ORIGINS:https://statistics.gov.rw,https://example.org
```

Rules, from [lib/security.ts](../lib/security.ts):

- The deploy's own origin is always allowed, even when `ALLOWED_ORIGINS` is empty.
- Matching is exact-string on `new URL(origin).origin`. No wildcards, no trailing slashes, no `*`. `https://example.org` does not cover `https://www.example.org`.
- A cross-site request that carries no `Origin` (`Sec-Fetch-Site: cross-site`) is refused — that combination is a CSRF-shaped probe.
- `OPTIONS /api/v1/chat` is a real preflight handler: `204`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`, `Access-Control-Max-Age: 600`. Allow-listed responses echo the request origin and set `Vary: Origin`, so never cache one cross-origin response with a shared CDN key.
- Credentials are never granted: no `Access-Control-Allow-Credentials`, and the app stores no session.

Test both directions against a deployed instance:

```sh
# expect 403 ORIGIN_DENIED
curl -sS -o /dev/null -w '%{http_code}\n' https://<baza-origin>/api/v1/chat \
  -H 'Content-Type: application/json' -H 'Origin: https://not-allowed.example' \
  --data '{"message":"poverty","language":"en","history":[]}'

# expect 200 and access-control-allow-origin: https://example.org
curl -sS -D - -o /dev/null https://<baza-origin>/api/v1/chat \
  -H 'Content-Type: application/json' -H 'Origin: https://example.org' \
  --data '{"message":"poverty","language":"en","history":[]}'; echo
```

Both paths are also covered without a network in `npm test` (`tests/security.test.ts`).

## 5. Limits, failures and retries

| Constraint | Value | If exceeded |
| --- | --- | --- |
| Request body | 16 384 bytes | `413 BODY_TOO_LARGE` (checked on `Content-Length` and while streaming) |
| `message` | 2000 chars | `400 INVALID_INPUT` |
| `history` | 6 items, 3000 chars each | `400 INVALID_INPUT` |
| Rate limit | 30 requests / 60 s per client IP **per isolate** | `429 RATE_LIMITED` + `Retry-After: 60` |
| Live catalogue call | 8 s abort, 400 KB cap, redirects refused | local fallback, `mode: "fallback"` + `reason` |
| Client timeouts in the UI | 12 s (`AbortSignal.timeout`) | the request is aborted, nothing is retried |

Error bodies are uniform: `{ "error": { "code": "…", "message": "…" } }`. Codes in play: `INVALID_INPUT`, `INVALID_JSON`, `JSON_REQUIRED`, `BODY_TOO_LARGE`, `ORIGIN_DENIED`, `RATE_LIMITED`, `UNKNOWN_INDICATOR`, `BUSY`, `INTERNAL_ERROR`. Messages are already in English and deliberately free of internals; do not surface `INTERNAL_ERROR` details you don't have.

Retry policy worth writing into your client: retry `429` once after `Retry-After`, retry network failure once with a fresh `AbortSignal.timeout(12000)`, and never retry a `403` or `400` — those are yours to fix. `503 BUSY` means the limiter's key map hit its ceiling; back off, do not fan out.

All API responses carry `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Request-ID`. Include `X-Request-ID` in bug reports — it is the only correlation handle, because nothing is logged server-side.

## 6. Data-handling claims you can repeat

- Chat messages are not persisted anywhere. History is rebuilt per request from the client and dropped when the tab closes.
- Nothing is sent to a paid model API in the answer path. `/api/v1/chat` performs no outbound calls; only `/api/v1/catalog` does, and only to the NISR MCP endpoint over HTTPS.
- If visitors enable the optional on-device model, their questions for that explanation stay on the device; model files download from public Hugging Face / MLC hosting. That download is theirs, so never enable it for them.
- CSV exports are built in the browser from the answer's own rows and include source URL, page and locator per row; leading `=`/`+`/`@` characters are defanged before they reach a spreadsheet.

## 7. What integration does not buy you

Baza is a hackathon prototype over two publications. It has no SLA, no versioned upgrade path, no authenticated tenancy, and no district, quarterly or microdata coverage — see [DATA_PROVENANCE.md](DATA_PROVENANCE.md) and the limitations list in the README. Treat it as a citation-linked lookup over a fixed collection, and keep "not an official NISR service" visible in any embedded surface, as it is in the standalone app.
