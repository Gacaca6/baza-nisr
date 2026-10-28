# AI-use disclosure

The competition conditions we are submitting under require **disclosed AI assistance** alongside originality, acknowledged references and transfer of IP in the submitted work to NISR. This file is that disclosure, in three parts: what AI did while the project was built, what AI does while it runs, and what no model in this project is trusted to do.

## 1. AI assistance during development

This prototype was written with AI coding assistants. Concretely:

| Where AI was used | What it produced | How it was checked |
| --- | --- | --- |
| Architecture and planning | The retrieval-first design (deterministic answer engine, optional local model), the work breakdown, the risk list | Reviewed and accepted by the team before implementation |
| Application code | Next.js/vinext app, `lib/*` engine and security layers, React surfaces, vendored shadcn/ui wiring | `npm test` (66 tests), `npx tsc --noEmit`, `npm run build`, manual runs of every flow |
| Data extraction | Scripts and pass-through transcription of tables from the two pinned NISR PDFs into [lib/evidence.ts](../lib/evidence.ts) | Line-for-line human verification against the source PDFs; document SHA-256 pinned; see [DATA_PROVENANCE.md](DATA_PROVENANCE.md) |
| Evaluation | The question set in [eval/cases.json](../eval/cases.json), the runner, and the defect list it produced | Expectations written from the source tables *before* the run, not copied from engine output; [EVALUATION.md](EVALUATION.md) |
| Documentation | This repository's README and `docs/*` | Re-checked against the code they describe; every claim in them points at a file, a test or a measured number |
| Research | Reading and summarising reference projects (World Bank Data AI Chatbot, EPAM StatGPT, GOV.UK Chat) and the 29-repository licence/activity matrix kept in the sibling `research/` notes, which are not redistributed in this repository | Only permissive, attributed components were carried into the code |

No AI-generated claim has been published without a human checking the underlying source. Where a model produced a plausible-sounding number that was not in a publication, it was discarded rather than corrected — the seven engine defects listed in [EVALUATION.md](EVALUATION.md) are the record of what the review caught.

**Responsibility stays with the team.** The humans named on the submission form own the code, the data, this disclosure and any error in either. Model output is not an author, cannot sign the entry, and is not a team member.

## 2. AI at runtime

**The answer path contains no language model.** A question is matched to indicators, filtered against a versioned set of 64 verified observations, and rendered by typed application code. Every arithmetic result comes from [lib/answer.ts](../lib/answer.ts) — `calculateDifference()` over two displayed values, with the formula and the two observation IDs returned in the payload. `/api/v1/chat` makes no outbound network call. Nothing is sent to a paid model API, so there is no inference cost to report and no prompt leaves the deployment on the answer path.

The only model in the product is **opt-in, on-device and non-authoritative**:

- Qwen3 1.7B (`Qwen3-1.7B-q4f16_1-MLC`) via [WebLLM](https://github.com/mlc-ai/web-llm), running on WebGPU in the visitor's own browser inside [lib/local-ai.worker.ts](../lib/local-ai.worker.ts).
- It does not start, and no weights download, until the visitor presses **Download & enable local AI** in the dialog ([components/local-model.tsx](../components/local-model.tsx)). The consent note tells them the files come from Hugging Face and MLC's public hosting and that the first download is roughly 1–2 GB.
- It has one job: restate the definition and caveats of an answer the engine already produced, in the active interface language. The button appears only when `status === "supported"` and the model is ready.
- Its output is rendered in a separate block under the label **"On-device AI explanation · experimental"**, followed by **"AI wording is not verified. The source-backed values above remain authoritative. Kinyarwanda quality has not been evaluated."** It never replaces, edits or reorders the evidence table.
- Questions used for local explanation stay on the device. Questions sent to the evidence API are processed without persistent chat storage — there is no database, no session, and no conversation log.

## 3. What no model in this project is trusted to do

| Not trusted to | Because | Enforced by |
| --- | --- | --- |
| Produce, alter or round a statistic | A fluent wrong number is the failure mode this project exists to avoid | The engine only emits values present in the collection; unit and evaluation tests assert every figure against [lib/evidence.ts](../lib/evidence.ts) |
| Decide whether a question is answerable | Scope refusal must be a rule a reviewer can read, not a model's judgement | `buildAnswer()` returns `unavailable`/`clarification` with `rows: []`; 66 of the 171 evaluations are refusals |
| Choose or attach a citation | A real-looking citation to the wrong table is worse than no citation | Rows carry `sourceId`, `pdfPage` and `locator` copied from the source; evaluation checks citation correctness separately from value correctness |
| Add numbers to its own explanation | Model arithmetic is not reproducible | The system prompt: "Never invent statistics… Do not add numbers. Explain only the supplied definition and caveats." `temperature: 0.1`, `max_tokens: 280` |
| Follow instructions found inside documents or user text | Retrieved content is evidence, not authority | `buildAnswer` rejects injection and secret-extraction requests in all three languages; document fetching is limited to `https://*.statistics.gov.rw`; the catalogue drops any link off that host rather than showing it |
| Emit chain-of-thought or hidden reasoning | It would be presented to the public as expert commentary | `/no_think`, the response is rejected if a `<think>` block survives, and the panel shows only the final text |
| Run arbitrary code, SQL or tool calls | No model-side execution exists in this design | No code interpreter, no SQL, no function calling; the API surface is the five documented endpoints with `.strict()` schemas, a 16 KiB body cap and per-isolate throttling ([lib/security.ts](../lib/security.ts)) |
| Speak for NISR | It is a student prototype | "Baza NISR is a student project, not an official NISR service" appears in the app in all three languages, plus the disclaimer at the top of the README |

The evaluation independently checks generated answers before release: any percentage appearing in the deterministic answer prose that is not one of that response's own row values, published uncertainty fields or calculation is a bug we treat as a release blocker, and `eval/run.mts` fails the run if it finds one.

## 4. Limits of this disclosure

- **Translations are machine-assisted and unreviewed.** Kinyarwanda and French strings were drafted with AI help and checked for consistency, not by native speakers. The evaluation proves values, periods and sources survive translation; it says nothing about fluency. This is stated in the product's own limitations text and in the README.
- **The evaluation has no LLM judge.** Expectations were authored before the run, so the harness measures the engine, not a model's opinion of the engine. It is not a benchmark against other assistants, and no comparative performance claim is made.
- **No user study has been run.** Nothing here is a measured-impact claim.
- **Third-party licences still apply to third-party artifacts.** Model weights (Qwen3 via MLC, hosted on Hugging Face), WebLLM, Next.js, vinext, lucide and the vendored MIT shadcn/ui components remain under their own terms; attribution is in the README and [vendor/](../vendor/). NISR data and publications remain © NISR. The model's own licence terms and acceptable-use policy were not audited beyond checking that redistribution of the project does not require redistributing the weights, which are downloaded from their public host at runtime.
- **If you are a judge and want to test the boundary**, the shortest path is to ask the assistant for a district unemployment figure, a monthly figure, or a count of people. Every one of those returns a refusal that names what is missing, and none of them reaches a language model.
