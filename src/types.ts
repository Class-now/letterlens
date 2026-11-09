// Shared shapes for the analysis of one letter. Every extracted fact points back to the exact
// span of the letter text it came from, so the UI can show and highlight the original Japanese.

/** A span of the letter text: text === letter.slice(start, end). */
export type Quote = { text: string; start: number; end: number };

export type Confidence = "high" | "medium" | "low";

export type DocType =
  | "resident_tax"
  | "health_insurance"
  | "pension_student"
  | "mynumber_renewal"
  | "reminder"
  | "unknown";

export type Action = {
  title: string;
  deadline?: { date: string; source: Quote }; // date is YYYY-MM-DD
  amountYen?: { value: number; source: Quote };
  how: string[];
  confidence: Confidence;
};

export type Item = { text: string; source?: Quote };

export type Term = { term: string; reading: string; meaning: string };

export type Analysis = {
  docType: DocType;
  sender: string;
  summary: string;
  actions: Action[];
  consequences: Item[];
  glossary: Term[];
  warnings: string[];
  language: string;
};
