import {test} from "node:test";
import assert from "node:assert/strict";
import {collectionLine,counts,pinnedLine} from "../lib/collection";
import {indicators,observations,sources} from "../lib/evidence";
import {ui} from "../lib/i18n";
import {NST2_URL,strategy} from "../lib/strategy";
import {buildAnswer} from "../lib/answer";
import {rowsToCsv} from "../lib/csv";
import type {Language} from "../lib/domain";

const langs: Language[] = ["en", "rw", "fr"];

test("the derived collection counts match the evidence files", () => {
  assert.equal(counts.o, observations.length);
  assert.equal(counts.i, indicators.length);
  assert.equal(counts.r, sources.length);
});

test("no template placeholder is rendered while a count is missing", () => {
  for (const lang of langs) {
    for (const line of [collectionLine(lang), pinnedLine(lang)]) {
      assert.ok(!line.includes("{"), line);
      assert.match(line, /\d/, line);
    }
  }
});

test("the i18n coverage templates keep every count token", () => {
  for (const lang of langs) {
    assert.match(ui[lang].coverage, /\{o\}.*\{i\}.*\{r\}/);
    assert.match(ui[lang].pinned, /\{r\}/);
  }
});

test("each language maps the same three NST2 aims with locators", () => {
  assert.deepEqual(Object.keys(strategy), langs);
  for (const lang of langs) {
    const section = strategy[lang];
    assert.equal(section.items.length, 3);
    for (const item of section.items) {
      assert.match(item.locator, /^NST2, printed p\.\d+ · PDF \d+$/);
      assert.ok(item.quote.length > 60 && item.relevance.length > 40);
      assert.match(NST2_URL, /^https:\/\/www\.minecofin\.gov\.rw\//);
    }
    assert.deepEqual(strategy[lang].items.map((i) => i.quote), strategy.en.items.map((i) => i.quote));
  }
});

test("the chart truncation note keeps both count tokens", () => {
  for (const lang of langs) assert.match(ui[lang].chartNote, /\{n\}.*\{total\}/);
});

test("the CSV exports the interval and coefficient of variation beside the rate", () => {
  const cells = (line: string) => [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  const [header, districtRow] = rowsToCsv(buildAnswer({ message: "Poverty in Gasabo district", language: "en", history: [] }).rows).split("\r\n");
  const column = (name: string) => { const i = cells(header).indexOf(name); assert.ok(i > 0, header); return i; };
  assert.equal(cells(districtRow)[column("coefficient_of_variation")], "16.7");
  assert.equal(cells(districtRow)[column("confidence_interval_lower")], "7.4");
  assert.equal(cells(districtRow)[column("confidence_interval_upper")], "14.7");
  const national = cells(rowsToCsv(buildAnswer({ message: "What is the poverty rate in Rwanda?", language: "en", history: [] }).rows).split("\r\n")[1]);
  assert.equal(national[column("coefficient_of_variation")], "", "a row with no published CV must export an empty cell, not a zero");
});
