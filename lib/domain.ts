export type Language = "en" | "rw" | "fr";
export interface ChatAnswer { resolvedQuestion?: string; }
export type Localized = Record<Language, string>;
export type IndicatorId = "poverty" | "extreme-poverty" | "unemployment" | "youth-unemployment" | "participation" | "employment" | "underutilization";
// The 30 districts as EICV7 Annex Table A9.23 spells them. Kept as a literal union so a mistyped
// place name fails the build instead of becoming an observation no question can reach.
export type District = "Nyarugenge" | "Gasabo" | "Kicukiro" | "Nyanza" | "Gisagara" | "Nyaruguru" | "Huye" | "Nyamagabe" | "Ruhango" | "Muhanga" | "Kamonyi" | "Karongi" | "Rutsiro" | "Rubavu" | "Nyabihu" | "Ngororero" | "Rusizi" | "Nyamasheke" | "Rulindo" | "Gakenke" | "Musanze" | "Burera" | "Gicumbi" | "Rwamagana" | "Nyagatare" | "Gatsibo" | "Kayonza" | "Kirehe" | "Ngoma" | "Bugesera";
export type Geography = "Rwanda" | "Urban" | "Rural" | "Kigali" | "Southern" | "Western" | "Northern" | "Eastern" | District;
export type Operation = "lookup" | "compare" | "trend" | "definition" | "discovery";
export interface Source { id: string; title: string; survey: string; period: string; url: string; pdf: string; sha256: string; retrievedAt: string; methodology: Localized; }
export interface Indicator { id: IndicatorId; label: Localized; definition: Localized; terms: string[]; sourceId: string; unit: "%"; population: Localized; }
export interface Observation { id: string; indicator: IndicatorId; value: number; year: number; period: string; geography: Geography; group: "All" | "Female" | "Male"; sourceId: string; pdfPage: number; locator: string; method: string; estimate: "survey" | "modelled"; ci?: [number, number]; cv?: number; caution?: Localized; }
export interface EvidenceRow extends Observation { label: string; population: string; unit: "%"; sourceUrl: string; }
export interface ChatAnswer { requestId: string; language: Language; status: "supported" | "clarification" | "unavailable" | "discovery"; answer: string; title: string; rows: EvidenceRow[]; sources: Source[]; notes: string[]; suggestions: string[]; operation: Operation; calculation?: { value: number; unit: "percentage points"; formula: string; inputIds: string[] }; mode: "verified-evidence"; coverage: string; }
