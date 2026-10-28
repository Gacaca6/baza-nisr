# Evaluation

Reproduce with:

```sh
npm run eval
```

The runner reads [cases.json](../eval/cases.json), calls the answer path directly for every case in every interface language, checks the result against the expectation written *before* the run, prints failures, exits non-zero if anything fails, and regenerates [results.json](../eval/results.json) and [results.md](../eval/results.md). Commit those two files whenever the collection or the engine changes so published numbers always describe shipped code.

Current run: `171/171` case-language combinations, evidence collection `2026-10-28.1`, question set `2026-10-28.2`.

## Question set

57 intents, each asked in Kinyarwanda, English and French — 171 evaluations.

| Group | Intents | What it covers |
| --- | --- | --- |
| statistical | 32 | National, urban/rural and all four provincial poverty rates; three named districts, a district-to-district comparison and the full 30-district ranking, all from Annex Table A9.23; extreme poverty, including its French and English food-poverty names; the modelled 2017 baseline; rural-urban and 2017-vs-2024 comparisons; unemployment level, trend and sex split; youth unemployment; participation; employment-to-population ratio; labour underutilization; three definitions; one dataset-discovery request |
| context | 3 | Dimensional follow-up ("And in rural areas?"), period follow-up ("What about 2019?"), and a mid-conversation language switch |
| unsupported | 22 | Future years, district cross-tabulations the source does not publish (extreme poverty or unemployment by district, a district in a year without district estimates), quarterly and monthly requests, a forecast, another country, sex disaggregation the source does not publish, an incompatible cross-indicator comparison, household-vs-people denominators, two prompt-injection attempts, a greeting, two out-of-scope indicators, a headcount request, and two withheld high-CV estimates |

Expected values, pages and table locators were transcribed from the pinned publications in `data/originals/` before the engine was run against them. The runner never adjusts an expectation to match output.

## Metrics and this run

| Metric | Denominator | Result | Meaning |
| --- | --- | --- | --- |
| Exact-value accuracy | 93 | 93/93 | Returned values equal the published table values |
| Citation correctness | 93 | 93/93 | Every row carries the expected source, PDF page and table locator |
| Observation grounding | 210 rows | 210/210 | Every row resolves to a stored observation with the same value and an official `statistics.gov.rw` URL |
| Traceable figures in prose | 93 | 93/93 | No percentage appears in answer text that is not in that answer's own rows or calculation |
| Language invariance | 57 intents | 57/57 | The same intent returns the same observation IDs and values in all three languages |
| Appropriate refusal | 66 | 66/66 | Every unsupported request declines, returns zero rows, and computes nothing |
| Response time (in-process) | 171 | p50 0.356 ms · p95 2.135 ms · max 8.01 ms | Deterministic answer path, one warm-up call discarded |

Per-language pass rate is 57/57 in English, Kinyarwanda and French. Provider cost per answer is zero: the answer path makes no model call and no network request.

## What the first run found

The initial run scored **137/150** — 10 of 50 intents failing, 21 failed checks plus 8 cross-language consistency flags. Each failure was an engine defect, not a bad expectation, and all seven root causes are now fixed and locked into the unit suite:

| Found | Impact | Fix |
| --- | --- | --- |
| `"employment rate"` matched as a substring inside "unemployment rate" | English unemployment questions returned the employment-to-population ratio — **55.9% instead of 12.4%** | Term matching now requires whole-word boundaries ([lib/answer.ts](../lib/answer.ts) `termMatch`) |
| Month names were not recognised as a period request | "unemployment rate in April 2025" was answered with the annual value | Explicit month guard in all three languages; the English modal "may" is matched only beside a preposition or a year |
| Kinyarwanda locative form `mu gihembwe` | A quarterly request passed the annual-only guard | Guard matches the `gihembwe` stem, covering both noun-class forms |
| Kinyarwanda `ku bagore` / `ku bagabo` | Sex-disaggregated poverty was answered with the national rate | Gender detection accepts elided forms |
| Kinyarwanda `uhimbe` ("invent") | An injection attempt was answered with real data instead of refused | Injection patterns cover the verb form |
| `urufunguzo` (key), `clé API` | Secret-extraction requests fell through to generic clarification rather than an explicit refusal | Blocked patterns cover both languages |
| `mu Icongereza` ("in English") | A mid-conversation language switch failed in Kinyarwanda only | Language-name detection accepts the alternate forms |

The employment/unemployment collision is the one worth reading again: an English user asking about unemployment would have been shown a different indicator's number, correctly cited to a real table. Deterministic evidence and a real evaluation set are what caught it.

To confirm the runner is not passing vacuously, `findIndicator` was temporarily forced to match every term: the same suite reported 81/150 with 150 failing checks on the 50-intent set it was run against. The harness detects regressions.

## What the district set changed

Adding 30 district observations was the first time the collection carried figures that a sentence could easily misquote. Two guardrails were written for it:

- Answer prose may name a coefficient of variation only because that number is stored on its own row (`cv`), which the traceable-figures metric then checks. Our own 15% flagging threshold never appears in an answer — a unit test asserts the figure is absent — so a Baza convention can never read as an NISR rule.
- The `traceableFiguresInProse` denominator rose with the district cases, and the 30-row ranking passes it as a single answer, which is the strongest form of the check in the set.

## What this run does not prove

- **It is not a language-model benchmark.** Answers are produced by rules over stored observations, so 100% measures routing, citation and refusal correctness against a set authored from the same tables. It cannot tell us how the system handles phrasing nobody wrote down.
- **Translation quality is unmeasured.** The invariance metric checks that values, sources and periods survive translation and that the interface language is honoured. Native-speaker review of Kinyarwanda and French wording is still outstanding.
- **No held-out set.** The research plan called for a subset withheld from prompt tuning. Because intent routing is hand-written rather than tuned, this run does not carry that separation; it should be introduced before any model-assisted routing is added.
- **Coverage is not accuracy.** A refused district value is counted as correct refusal; whether NISR's report actually contains the user's district is outside this set.
- **No user study.** The planned comparison — the same task on statistics.gov.rw versus here, recording completion, time and errors — has not been run, so no usability or impact claim is made.
- **Server-side timing is separate.** These are in-process numbers. Deployed latency adds request handling and network; the catalogue probe has its own 8s budget and falls back locally when it fails.
- **The live catalogue is not covered by these cases.** It is exercised through `POST /api/v1/catalog` and the Sources screen; its results are metadata, not statistical observations, and are reported separately.
