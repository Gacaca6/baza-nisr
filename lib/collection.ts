import type { Language } from "./domain";
import { indicators, observations, sources } from "./evidence";
import { ui } from "./i18n";

// The collection counts shown in the interface are read from the evidence module, so a data edit
// cannot leave a stale headline number on screen.
export const counts = { o: observations.length, i: indicators.length, r: sources.length };

const fill = (template: string) =>
  template.replace(/\{([oir])\}/g, (_, key: string) => String(counts[key as keyof typeof counts]));

export const collectionLine = (lang: Language) => fill(ui[lang].coverage);
export const pinnedLine = (lang: Language) => fill(ui[lang].pinned);
