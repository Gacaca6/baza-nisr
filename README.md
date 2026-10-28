# Baza NISR

A trilingual assistant for Rwanda's official statistics. Ask in Kinyarwanda, English or French, get a figure with its publication, table, reference period and denominator, and follow the citation back to the original NISR PDF.

**Baza NISR is an independent student hackathon prototype. It is not an NISR product, is not endorsed by NISR, and does not speak for NISR.**

Built for the 2026 NISR Big Data Hackathon. Submission target: a public repository and a deployed URL.

## What it does, and what it refuses

Answers come from a small, versioned collection of verified aggregate observations, not from a language model. The model is optional and only ever explains an answer that application code already produced.

| | Behaviour |
| --- | --- |
| **Answers** | 64 observations · 7 indicators · 2 official publications · 3 interface languages |
| **Cites** | Publication, official PDF URL, page, table locator, reference period, unit, population, methodology note, and a 95% confidence interval where the source publishes one |
| **Calculates** | Differences between two comparable observations, in application code, from the displayed values |
| **Refuses** | District values, quarterly or monthly figures, years outside the collection, sex disaggregation the source does not publish, counts of people, forecasts, other countries, incompatible comparisons, and prompt-injection attempts |

A refusal never substitutes a nearby number. `Poverty in Gasabo district` returns "no verified value for that place in this collection", not a provincial estimate.

## Run it

Requires Node.js `>=22.13.0`. No API key, no paid service, no database.

```sh
npm run install:ci   # one locked dependency install
npm run dev          # portable preview at http://localhost:5173
```

Verify the whole project locally before publishing:

```sh
npm test             # 66 unit tests over routing, evidence and security
npm run eval         # 150 evaluated question-language pairs, writes eval/results.md
npm run typecheck
npm run build        # deployable Cloudflare Worker output in dist/
```

`npm run typecheck` checks source only. If you have run both `npm run build` (vinext) and `npm run build:node` (Next) in the same checkout, they write different generated types into `.next/types` and the stale pair can report errors inside `.next/types/validator.ts` — nothing to do with your code. Delete `.next` and run it again.

Configuration lives in [.env.example](.env.example) and is optional:

| Variable | Purpose | Default |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | Comma-separated origins permitted to call the JSON endpoints from a browser | empty — same-origin only |

The embedded widget makes same-origin requests from inside its own iframe, so a site that only embeds the widget needs no entry here.

## How an answer is produced

```
question + interface language + bounded conversation context
  → normalise, correct known statistical typos, resolve follow-ups
  → identify indicator, geography, period and requested operation
  → filter the verified observation set
  → calculate with a typed function when a comparison is requested
  → render the answer in the requested language
  → reject any percentage in the prose that does not come from the returned rows
```

The code for that path is [lib/answer.ts](lib/answer.ts), with the evidence in [lib/evidence.ts](lib/evidence.ts) and conversation resolution in [lib/conversation.ts](lib/conversation.ts). Retrieved documents are treated as evidence, never as instructions; document fetching is restricted to `*.statistics.gov.rw` ([lib/catalog.ts](lib/catalog.ts)).

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/chat` | Answer a question with sources, evidence rows and optional calculation |
| `GET /api/v1/sources` | Indexed publications, periods, methodology and content hashes |
| `GET /api/v1/observations` | The full observation set, optionally filtered by `?indicator=` |
| `POST /api/v1/catalog` | Live NISR catalogue discovery through the public MCP endpoint, with local fallback |
| `GET /api/health` | Readiness and collection version; exposes no configuration |
| `GET /embed` | Compact chat surface for another site's iframe |
| `GET /widget.js` | Loader script for the embedded assistant |

Machine-readable contract: [openapi.json](public/openapi.json). Integration recipes: [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Documentation

- [docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md) — sources, content hashes, verification, and the runbook for adding a publication
- [docs/EVALUATION.md](docs/EVALUATION.md) — question set, metrics, results and what the run does not prove
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Cloudflare Workers, Docker, environment, cost and handover
- [docs/INTEGRATION.md](docs/INTEGRATION.md) — widget, iframe, API and cross-origin rules
- [docs/AI_DISCLOSURE.md](docs/AI_DISCLOSURE.md) — where AI was used, and what it is not trusted to do

## Known limitations

Read these before citing the prototype in any decision.

- The collection is deliberately narrow: EICV7 poverty and living conditions (2023/24) and annual Labour Force Survey indicators (2019–2025). It is not the NISR catalogue.
- District estimates are absent. The EICV7 report publishes district material; we have not verified it to our standard, so the assistant will not infer a district figure from a provincial one.
- Two extreme-poverty provincial estimates (City of Kigali 1.1%, Northern 3.2%) are withheld because the source flags their coefficient of variation as above 15%.
- Comparisons use rounded displayed values. The published change may differ.
- Kinyarwanda and French wording has not been reviewed by native speakers. The evaluation checks that values, periods and sources survive translation; it does not certify fluency.
- The rate limiter is per process/isolate. A public rollout needs an edge-level limit.
- NISR catalogue links outside `statistics.gov.rw` are withheld for review rather than displayed, and empty catalogue pages stop pagination.
- The optional in-browser model needs WebGPU and downloads roughly 1–2 GB. Verified answers work without it.
- No user study has been run. We make no measured-impact claim.

## Acknowledgements and references

- Source publications: NISR [EICV7 Main Indicators Report](https://statistics.gov.rw/statistical-publications/poverty-and-social-protection/eicv7-main-indicators-report-202324) and [Labour Force Survey 2025](https://www.statistics.gov.rw/data-sources/surveys/Labour-Force-Survey/labour-force-survey-2025). Statistics remain © NISR.
- Public NISR MCP catalogue endpoint and its documented `nada_search_catalog` / `nada_get_metadata` tools: [documentation](https://microdatabk.statistics.gov.rw/mcp-docs).
- Architecture references studied before writing code: World Bank [Data AI Chatbot](https://github.com/worldbank/data-ai-chatbot) and EPAM [StatGPT](https://github.com/epam/statgpt) for evidence-linked answering, and GOV.UK Chat for public-sector assistant conventions.
- Interface components use [shadcn/ui](https://ui.shadcn.com/) patterns under the MIT licence; vendored copy and licence note in [vendor/](vendor/). Icons from [lucide](https://lucide.dev/). On-device inference uses [WebLLM](https://github.com/mlc-ai/web-llm) with the Qwen3 1.7B weights hosted by MLC.
- Framework: [vinext](https://github.com/cloudflare/vinext) on Next.js, deployed as a Cloudflare Worker.

Research notes, the 29-repository licence and activity matrix, and the read-only NISR MCP probes are kept in the sibling `research/` package and are not redistributed here because third-party licences apply.

## Licence and IP

Source is published for judging and review. Competition conditions transfer IP in the submitted work to NISR and require disclosed AI assistance; see [docs/AI_DISCLOSURE.md](docs/AI_DISCLOSURE.md). NISR data and publications remain NISR's.
