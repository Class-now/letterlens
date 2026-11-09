// Deterministic analysis without any model: the hand-checked result for the 5 bundled samples,
// otherwise the extractor's facts plus the static doc-type guidance, in English.
import a from "../samples/expected/a-resident-tax.json";
import b from "../samples/expected/b-health-insurance.json";
import c from "../samples/expected/c-pension-student.json";
import d from "../samples/expected/d-mynumber-renewal.json";
import e from "../samples/expected/e-tax-reminder.json";
import { classify, GUIDANCE } from "./doc-types";
import { extractFacts, type Facts } from "./extract";
import type { Action, Analysis, Quote } from "./types";

const SAMPLES = [a, b, c, d, e] as unknown as Analysis[];

function quotesOf(value: unknown): Quote[] {
  if (Array.isArray(value)) return value.flatMap(quotesOf);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.text === "string" && typeof o.start === "number" && typeof o.end === "number") return [o as Quote];
    return Object.values(o).flatMap(quotesOf);
  }
  return [];
}

/** The bundled sample whose every quote sits at the same place in `text`, if any. */
export function matchSample(text: string): Analysis | undefined {
  return SAMPLES.find((s) => {
    const qs = quotesOf(s);
    return qs.length > 0 && qs.every((q) => text.slice(q.start, q.end) === q.text);
  });
}

const DEADLINE_HINT = /(期限|納期|期日|まで|迄)/;

function deadlineActions(text: string, facts: Facts): Action[] {
  const docType = classify(text).docType;
  const how = GUIDANCE[docType].how;
  if (facts.instalments.length) {
    return facts.instalments.map((row) => ({
      title: `Instalment ${row.period}: pay by the deadline`,
      ...(row.deadline && { deadline: { date: row.deadline.date, source: row.deadline.source } }),
      ...(row.amount && { amountYen: { value: row.amount.value, source: row.amount.source } }),
      how,
      confidence: "medium" as const,
    }));
  }
  const lines = text.split("\n");
  let offset = 0;
  const actions: Action[] = [];
  for (const line of lines) {
    const end = offset + line.length;
    if (DEADLINE_HINT.test(line)) {
      const inLine = <T extends { source: Quote }>(x: T) => x.source.start >= offset && x.source.end <= end;
      const date = facts.dates.filter(inLine).at(-1);
      if (date && !actions.some((x) => x.deadline?.date === date.date)) {
        const amount = facts.amounts.find(inLine);
        actions.push({
          title: "Deadline in this letter: check what it is for",
          deadline: { date: date.date, source: date.source },
          ...(amount && { amountYen: { value: amount.value, source: amount.source } }),
          how,
          confidence: "low",
        });
      }
    }
    offset = end + 1;
  }
  return actions.slice(0, 8);
}

export function fallbackAnalysis(text: string, language: string): Analysis {
  const sample = matchSample(text);
  const warnings: string[] = [];
  if (language !== "en") warnings.push("The AI is not available, so this explanation is in English only.");
  if (sample) return { ...structuredClone(sample), warnings: [...sample.warnings, ...warnings], language: "en" };

  const { docType } = classify(text);
  const g = GUIDANCE[docType];
  const facts = extractFacts(text);
  return {
    docType,
    sender: g.office,
    summary:
      docType === "unknown"
        ? "LetterLens could not tell what kind of letter this is. The dates and amounts found in it are listed below; check them on the letter."
        : `This looks like a ${g.label.en.toLowerCase()} (${g.label.ja}). The dates and amounts below were read directly from the letter.`,
    actions: deadlineActions(text, facts),
    consequences: [],
    glossary: [],
    warnings: [...warnings, "Without the AI, only dates and amounts were extracted. Check the letter yourself or ask the office."],
    language: "en",
  };
}
