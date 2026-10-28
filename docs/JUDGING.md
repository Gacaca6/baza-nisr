# Judges' guide

A 90-second walkthrough and, for each competition criterion, the exact screen to look at and the file that proves it.

**Live demo:** <https://gacaca6.github.io/baza-nisr/> — no account, no key, no install. It is the static GitHub Pages build, so the answer engine runs in the browser tab ([lib/answer.ts](../lib/answer.ts)).
**Widget proof:** <https://gacaca6.github.io/baza-nisr/widget-host.html> — a plain page with one `<script>` tag.

## The 90 seconds

| | What you do | What it proves |
| --- | --- | --- |
| 0:00 | Land on the home page | The strip above the heading states the whole evidence claim: *2 NISR PDFs, checked by SHA-256*. The focus card shows one real figure, 27.4%, with its survey and period. |
| 0:10 | Click the focus card | Answer: "27.4% of the population lived below the national poverty line in Rwanda in 2023/24." Below it, the evidence trail opens with the source PDF, **page 81, Table 9.1**, the 95% interval 26.4–28.3 and the chart. Nothing here was written by a model. |
| 0:25 | Ask `Compare poverty in 2017 and 2024` | 39.8% vs 27.4%, difference −12.4 percentage points, computed in code from the two displayed values. The 2017 row is tagged **Modelled baseline** and the note says why the published EICV5 figure is not substituted. This is the behaviour we most want credit for: it refuses to compare across methods silently. |
| 0:40 | Press **RW**, then `Gereranya ubukene mu cyaro no mu mijyi` | Same engine, same rows, Kinyarwanda prose: rural 31.6% vs urban 16.7%. Press **FR** and ask the French equivalent — the numbers do not move. |
| 0:55 | Ask `What is the poverty rate in each district?` | All 30 district estimates from Annex Table A9.23, ranked 51.4% (Nyamagabe) to 6.8% (Nyarugenge), each citing printed p.107 / PDF p.109. Five rows carry a **Low precision** tag because NISR publishes their coefficient of variation above 15%, and the answer quotes those coefficients instead of offering a clean ranking. Then ask `What is the extreme poverty rate in Musanze District?` → a refusal: the district table covers the poverty rate only. |
| 1:05 | **Explore the data** → filter → **Download CSV** | 15 columns per row including `reference_period`, `population`, `estimate_type`, `confidence_interval_lower` and `_upper`, `coefficient_of_variation`, `source_url` and `source_locator`. The file cites itself. |
| 1:15 | **Sources & methods** | Two publications, their content hashes under "Verify file identity", methodology and reference periods, plus what the collection does not cover. |
| 1:25 | **Integrate Baza** | One script tag for the widget, `openapi.json` for the contract, and the CORS rule. [docs/INTEGRATION.md](INTEGRATION.md) states which parts the hosted static build does not carry. |
| 1:35 | **Presentation** | The guided 5-step demo runner, and the section that quotes the National Strategy for Transformation against what the tool actually does. |

## Criterion by criterion

**Problem & relevance (20)** — Access to official statistics fails at the point of use, not publication. The demo is a citizen question, a planner comparison and a follow-up in one thread. Relevance is documented, not asserted: see the NST2 quotations on the Presentation page and [../lib/strategy.ts](../lib/strategy.ts). We do not claim a measured impact; no user study has been run.

**Data & methodology (20)** — 94 observations, 7 indicators, 2 publications, one evidence version (`2026-10-28.1`) printed in the footer. Every value carries page and table locator. The district set comes from Annex Table A9.23 and was published only after that table's own aggregate rows were shown to reproduce Table 9.1 line for line; the five districts whose published coefficient of variation is high are answered with the coefficient quoted, tagged *Low precision*, not hidden. Two extreme-poverty estimates are withheld *because* the source flags their coefficient of variation; comparisons across incompatible methods are refused rather than rounded into agreement. Runbook, hashes and the one internal disagreement in the source itself (Gisagara): [DATA_PROVENANCE.md](DATA_PROVENANCE.md). Measured behaviour: [EVALUATION.md](EVALUATION.md) — 171 case-language pairs, exact-value accuracy 93/93, citation correctness 93/93, observation grounding 210/210 rows, appropriate refusal 66/66.

**Technical innovation (20)** — The choice worth arguing is the one against the grain of this hackathon: the numbers do not come from a model. Routing, disambiguation of follow-ups, typed comparison arithmetic and the prose renderer are deterministic, so the same question returns the same figure and the same citation in any of the three languages, at under 3 ms p95 in the evaluated run. The optional in-browser model ([../components/local-model.tsx](../components/local-model.tsx)) can only explain an answer application code already produced, and the answer stands without it. The MCP catalogue client ([../lib/catalog.ts](../lib/catalog.ts)) fetches only from configured `*.statistics.gov.rw` hosts and treats retrieved text as evidence, never as instructions — the prompt-injection cases in the evaluation are the test for that.

**Usability & design (20)** — One composer, one task-first home, the evidence trail under every answer, and a language switch that re-renders the interface while keeping the answer's own language marked with `lang`. Charts are visible where applicable; tables expand on request; feedback captures a reason. Keyboard: Enter sends, Shift+Enter adds a line, Escape closes the mobile menu, and a skip link precedes the header. Findings and what is still open: [ACCESSIBILITY.md](ACCESSIBILITY.md).

**Tangible impact (20)** — The handover is the deliverable: a widget a ministry page can adopt with one tag, an OpenAPI contract for a tool that already speaks HTTP, a documented runbook for adding a publication, and a limits list a reviewer can argue with. [DEPLOYMENT.md](DEPLOYMENT.md) covers the three build paths and what each costs. Nothing here needs a paid service: the hosted site is GitHub Pages, and the server builds are self-hostable.

## Reproduce it

```sh
npm run install:ci
npm test             # 82 unit tests over routing, evidence, collection counts and security
npm run eval         # 171 case-language pairs; rewrites eval/results.md and eval/results.json
npm run typecheck
npm run lint
npm run build:pages  # the hosted artifact, written to out/
```

CI runs the same gates on every push: [.github/workflows/ci.yml](../.github/workflows/ci.yml) verifies, [.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml) publishes.

## What we will not talk our way past

- District coverage is one indicator for one period: the 2023/24 headcount poverty rate, from Annex Table A9.23. Nothing else is disaggregated by district, and no district figure is estimated from a provincial one. The annex gives Gisagara 45.6% while the report's own narrative says 46.6%; we publish the table value, cite the page and record the disagreement.
- Kinyarwanda and French wording has not been reviewed by native speakers.
- The hosted Pages build serves files only, so `POST /api/v1/chat` and live catalogue search are not on it. They run in the Node, Docker and Worker builds, and the static build says so on screen.
- The comparison figures use the values on screen, so they can differ from a published change computed on unrounded data.
- The optional local model needs WebGPU and downloads roughly 1–2 GB.
