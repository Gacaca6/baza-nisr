// Runs the fixed evaluation set and writes honest, reproducible results.
// Expectations live in cases.json and are never adjusted to match output.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildAnswer } from "../lib/answer";
import { observations, VERSION } from "../lib/evidence";
import type { ChatAnswer, EvidenceRow, Language } from "../lib/domain";

type CaseLanguage = Partial<Record<Language, string>>;
interface Expectation {
  status: ChatAnswer["status"][];
  values?: number[];
  rows?: number;
  ci?: [number, number];
  source?: string;
  page?: number;
  locator?: string;
  calculation?: number;
  estimate?: "survey" | "modelled";
  operation?: ChatAnswer["operation"];
  language?: Language | Partial<Record<Language, Language>>;
  noData?: boolean;
}
interface EvalCase { id: string; group: string; kind: string; expect: Expectation; languages: CaseLanguage; historyFrom?: string[] }
interface Spec { version: string; description: string; languages: Language[]; cases: EvalCase[] }
interface Failure { id: string; language: string; message: string; expected?: string; actual?: string }
interface TimedCase { id: string; group: string; language: Language; ms: number }

const here = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(here, "cases.json"), "utf8")) as Spec;
const byId = new Map(spec.cases.map((c) => [c.id, c]));
const knownObservations = new Map(observations.map((o) => [o.id, o]));

function historyFor(evalCase: EvalCase, language: Language) {
  return (evalCase.historyFrom ?? []).map((id) => {
    const prior = byId.get(id);
    if (!prior) throw new Error(`Case ${evalCase.id} references unknown history case ${id}`);
    const message = prior.languages[language];
    if (!message) throw new Error(`History case ${id} has no ${language} message`);
    return { role: "user" as const, content: message };
  });
}

function percentTokens(text: string) {
  return [...text.matchAll(/(-?\d+(?:[.,]\d+)?)\s*%/g)].map((m) => Number(m[1].replace(",", ".")));
}

function check(evalCase: EvalCase, language: Language, answer: ChatAnswer) {
  const problems: string[] = [];
  const expect = evalCase.expect;
  const wantLanguage = typeof expect.language === "string" ? expect.language : expect.language?.[language];

  if (!expect.status.includes(answer.status)) problems.push(`status ${answer.status} not in ${expect.status.join("|")}`);
  if (wantLanguage ? answer.language !== wantLanguage : answer.language !== language) problems.push(`response language ${answer.language}`);
  if (expect.operation && answer.operation !== expect.operation) problems.push(`operation ${answer.operation}`);
  if (expect.rows !== undefined && answer.rows.length !== expect.rows) problems.push(`row count ${answer.rows.length}`);

  if (expect.values) {
    const actual = answer.rows.map((r) => r.value);
    if (actual.length !== expect.values.length || actual.some((v, i) => v !== expect.values![i])) problems.push(`values [${actual.join(", ")}]`);
  }
  if (expect.ci && JSON.stringify(answer.rows[0]?.ci ?? null) !== JSON.stringify(expect.ci)) problems.push(`confidence interval ${JSON.stringify(answer.rows[0]?.ci)}`);
  if (expect.calculation !== undefined && answer.calculation?.value !== expect.calculation) problems.push(`calculation ${answer.calculation?.value}`);
  if (expect.estimate && !answer.rows.some((r) => r.estimate === expect.estimate)) problems.push("expected estimate missing");

  const cited = expect.source || expect.page || expect.locator;
  if (cited && answer.rows.length) {
    if (expect.source && !answer.rows.every((r) => r.sourceId === expect.source)) problems.push(`source ${[...new Set(answer.rows.map((r) => r.sourceId))].join(",")}`);
    if (expect.page && !answer.rows.every((r) => r.pdfPage === expect.page)) problems.push(`page ${[...new Set(answer.rows.map((r) => r.pdfPage))].join(",")}`);
    if (expect.locator && !answer.rows.every((r) => r.locator.startsWith(expect.locator!))) problems.push(`locator ${[...new Set(answer.rows.map((r) => r.locator))].join(" | ")}`);
  }
  if (expect.noData && (answer.rows.length || answer.calculation)) problems.push("returned data it should not have");

  // Every published row must resolve to a stored observation with an official locator.
  for (const row of answer.rows) {
    const stored = knownObservations.get(row.id);
    if (!stored || stored.value !== row.value) problems.push(`unresolvable observation ${row.id}`);
    else if (!row.sourceUrl.startsWith("https://statistics.gov.rw/") || !row.locator) problems.push(`weak citation ${row.id}`);
  }

  // A data-bearing answer may only contain percentages that come from its own rows.
  if (answer.status === "supported" && answer.rows.length) {
    // A district's coefficient of variation is a published figure stored on its own row, so quoting it is traceable.
    const allowed = new Set<number>(answer.rows.flatMap((r) => [r.value, ...(r.ci ?? []), ...(r.cv === undefined ? [] : [r.cv])]).concat(answer.calculation ? [answer.calculation.value] : []));
    const invented = percentTokens(answer.answer).filter((v) => !allowed.has(v));
    if (invented.length) problems.push(`untraceable figure ${invented.join(", ")}%`);
  }
  return problems;
}

const failures: Failure[] = [];
// One discarded call keeps module and regex warm-up out of the recorded timings.
buildAnswer({ message: spec.cases[0]!.languages.en!, language: "en", history: [] });
const timings: TimedCase[] = [];
const metricTotals = { exactValue: [0, 0], citation: [0, 0], groundingRows: [0, 0], proseNumbers: [0, 0] } as Record<string, [number, number]>;
const groupResults: Record<string, { total: number; pass: number }> = {};
const languageResults: Record<string, { total: number; pass: number }> = {};
const intentShapes = new Map<string, Map<string, string>>();

for (const evalCase of spec.cases) {
  for (const language of spec.languages) {
    const message = evalCase.languages[language];
    if (!message) { failures.push({ id: evalCase.id, language, message: "case has no message for this language" }); continue; }
    const started = performance.now();
    const answer = buildAnswer({ message, language, history: historyFor(evalCase, language) });
    const ms = performance.now() - started;
    timings.push({ id: evalCase.id, group: evalCase.group, language, ms });
    const problems = check(evalCase, language, answer);
    for (const problem of problems) failures.push({ id: evalCase.id, language, message: problem, expected: JSON.stringify(evalCase.expect), actual: `${answer.status} · ${answer.rows.map((r) => r.value).join(",") || "no rows"}` });

    const group = (groupResults[evalCase.group] ??= { total: 0, pass: 0 });
    group.total++; group.pass += problems.length ? 0 : 1;
    const lang = (languageResults[language] ??= { total: 0, pass: 0 });
    lang.total++; lang.pass += problems.length ? 0 : 1;

    if (evalCase.expect.values) { metricTotals.exactValue[0] += problems.length ? 0 : 1; metricTotals.exactValue[1]++; }
    if ((evalCase.expect.source || evalCase.expect.locator) && answer.rows.length) {
      const citedOk = (!evalCase.expect.source || answer.rows.every((r) => r.sourceId === evalCase.expect.source))
        && (!evalCase.expect.page || answer.rows.every((r) => r.pdfPage === evalCase.expect.page))
        && (!evalCase.expect.locator || answer.rows.every((r) => r.locator.startsWith(evalCase.expect.locator!)));
      metricTotals.citation[0] += citedOk ? 1 : 0; metricTotals.citation[1]++;
    }
    if (answer.status === "supported" && answer.rows.length) {
      const allowed = new Set<number>(answer.rows.flatMap((r) => [r.value, ...(r.ci ?? []), ...(r.cv === undefined ? [] : [r.cv])]).concat(answer.calculation ? [answer.calculation.value] : []));
      const clean = percentTokens(answer.answer).every((v) => allowed.has(v));
      metricTotals.proseNumbers[0] += clean ? 1 : 0; metricTotals.proseNumbers[1]++;
      for (const row of answer.rows) { metricTotals.groundingRows[0] += knownObservations.get(row.id)?.value === row.value ? 1 : 0; metricTotals.groundingRows[1]++; }
    }

    // Cross-language consistency: same intent must produce the same evidence, not the same wording.
    const shape = answer.rows.map((r: EvidenceRow) => `${r.id}:${r.value}`).join("|") || "none";
    const perIntent = intentShapes.get(evalCase.id) ?? new Map<string, string>();
    perIntent.set(language, shape);
    intentShapes.set(evalCase.id, perIntent);
  }
}

let invariancePass = 0, invarianceTotal = 0;
for (const [id, shapes] of intentShapes) {
  if (shapes.size < 2) continue;
  invarianceTotal++;
  if (new Set(shapes.values()).size === 1) invariancePass++;
  else failures.push({ id, language: [...shapes.keys()].join("/"), message: "values or sources differ across languages", actual: [...shapes].map(([l, s]) => `${l}=${s}`).join(" ") });
}

const sorted = timings.map((t) => t.ms).sort((a, b) => a - b);
const pct = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
const refusal = groupResults.unsupported ?? { total: 0, pass: 0 };
const totals = Object.values(groupResults).reduce((a, g) => ({ total: a.total + g.total, pass: a.pass + g.pass }), { total: 0, pass: 0 });
const rate = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "n/a");

const results = {
  generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  evidenceVersion: VERSION,
  specVersion: spec.version,
  runner: "eval/run.mts",
  environment: { node: process.version, platform: process.platform, paidModelCallsPerAnswer: 0, externalCallsPerAnswer: 0 },
  totals: { cases: totals.total, passed: totals.pass, failed: totals.total - totals.pass, passRate: rate(totals.pass, totals.total) },
  metrics: {
    exactValueAccuracy: `${metricTotals.exactValue[0]}/${metricTotals.exactValue[1]} (${rate(metricTotals.exactValue[0], metricTotals.exactValue[1])})`,
    citationCorrectness: `${metricTotals.citation[0]}/${metricTotals.citation[1]} (${rate(metricTotals.citation[0], metricTotals.citation[1])})`,
    observationGrounding: `${metricTotals.groundingRows[0]}/${metricTotals.groundingRows[1]} rows (${rate(metricTotals.groundingRows[0], metricTotals.groundingRows[1])})`,
    traceableFiguresInProse: `${metricTotals.proseNumbers[0]}/${metricTotals.proseNumbers[1]} answers (${rate(metricTotals.proseNumbers[0], metricTotals.proseNumbers[1])})`,
    languageInvariance: `${invariancePass}/${invarianceTotal} intents (${rate(invariancePass, invarianceTotal)})`,
    appropriateRefusal: `${refusal.pass}/${refusal.total} (${rate(refusal.pass, refusal.total)})`,
    responseTimeMs: { p50: Number(pct(0.5).toFixed(3)), p95: Number(pct(0.95).toFixed(3)), max: Number((sorted.at(-1) ?? 0).toFixed(3)) },
  },
  byGroup: groupResults,
  byLanguage: languageResults,
  failures,
};

writeFileSync(join(here, "results.json"), JSON.stringify(results, null, 2) + "\n");

const lines = [
  "# Evaluation results",
  "",
  `Generated by \`${results.runner}\` on ${results.generatedAt.slice(0, 10)} against evidence collection \`${results.evidenceVersion}\` and question set \`${results.specVersion}\`. Re-run with \`npm run eval\`.`,
  "",
  `${results.totals.passed}/${results.totals.cases} case-language combinations passed (${results.totals.passRate}). ${failures.length ? `**${failures.length} failing check(s) recorded below.**` : "No failures recorded in this run."}`,
  "",
  "## Metrics",
  "",
  "| Metric | Result |",
  "| --- | --- |",
  ...Object.entries(results.metrics).map(([k, v]) => `| ${k.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase())} | ${typeof v === "object" ? `p50 ${v.p50} ms · p95 ${v.p95} ms · max ${v.max} ms` : v} |`),
  "",
  "## By group",
  "",
  "| Group | Passed | Rate |",
  "| --- | --- | --- |",
  ...Object.entries(groupResults).map(([g, v]) => `| ${g} | ${v.pass}/${v.total} | ${rate(v.pass, v.total)} |`),
  "",
  "## By interface language",
  "",
  "| Language | Passed | Rate |",
  "| --- | --- | --- |",
  ...Object.entries(languageResults).map(([l, v]) => `| ${l} | ${v.pass}/${v.total} | ${rate(v.pass, v.total)} |`),
  "",
  "## Recorded failures",
  "",
  ...(failures.length ? ["| Case | Language | Finding |", "| --- | --- | --- |", ...failures.map((f) => `| ${f.id} | ${f.language} | ${f.message}${f.actual ? ` (actual: ${f.actual})` : ""} |`)] : ["None."]),
  "",
  "## What this run does not measure",
  "",
  "- Human-rated translation quality in Kinyarwanda and French; these cases check that the interface language is honoured and that values survive translation, not that the wording is native-level.",
  "- Real user comprehension, task completion or time-on-task; the small usability study in the plan has not been run.",
  "- Network latency and hosting cost. Timings measure the deterministic answer path in-process, excluding one discarded warm-up call; no paid model call is made to answer, so per-answer provider cost is zero.",
  "- Live NISR catalogue correctness. The catalogue probe is exercised by the Sources screen and is reported separately from these expectation-checked cases.",
  "",
];
writeFileSync(join(here, "results.md"), lines.join("\n"));

console.log(`${results.totals.passed}/${results.totals.cases} passed · ${failures.length} failing checks`);
for (const f of failures) console.log(`FAIL ${f.id} [${f.language}] ${f.message}${f.actual ? ` -> ${f.actual}` : ""}`);
process.exit(failures.length ? 1 : 0);
