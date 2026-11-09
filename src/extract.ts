// Deterministic parsers over the Japanese letter text: dates (Japanese era and western,
// month-day with the year inferred from context), yen amounts and instalment tables.
// Every result carries the exact span of the original text. These results validate and
// override what the LLM says: a date or amount that is not in the letter is dropped.
import type { Action, Confidence, Quote } from "./types";

export type YearSource = "explicit" | "range" | "fiscal_year" | "context" | "today";

export type DateMatch = {
  date: string; // YYYY-MM-DD
  source: Quote; // the date itself, without a trailing weekday like (火)
  yearFrom: YearSource;
  weekday?: string; // 日月火水木金土 as written after the date
  weekdayOk?: boolean;
};

export type DateRange = { from: DateMatch; to: DateMatch; source: Quote };

export type AmountMatch = { value: number; source: Quote; labelled?: boolean };

export type Instalment = { period: number; deadline?: DateMatch; amount?: AmountMatch; source: Quote };

export type Facts = {
  dates: DateMatch[];
  ranges: DateRange[];
  amounts: AmountMatch[];
  instalments: Instalment[];
};

export type ExtractOptions = { today?: Date };

const FULLWIDTH: Record<string, string> = {
  "，": ",", "．": ".", "￥": "¥", "（": "(", "）": ")", "／": "/", "－": "-", "：": ":", "％": "%",
};

/** Full-width digits and punctuation to ASCII, one character for one, so offsets stay valid. */
export function normalize(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xff10 && code <= 0xff19) out += String.fromCharCode(code - 0xff10 + 0x30);
    else out += FULLWIDTH[ch] ?? ch;
  }
  return out;
}

const ERA_BASE: Record<string, number> = { 令和: 2018, 平成: 1988, 昭和: 1925 };
const WEEKDAYS = "日月火水木金土";

function quote(text: string, start: number, end: number): Quote {
  return { text: text.slice(start, end), start, end };
}

function eraYear(era: string, n: string): number {
  return ERA_BASE[era] + (n === "元" ? 1 : Number(n));
}

function iso(y: number, m: number, d: number): string | undefined {
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return undefined;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function dayDiff(a: string, b: string): number {
  return (Date.parse(a) - Date.parse(b)) / 86_400_000;
}

const DATE_RE =
  /(?:(令和|平成|昭和)\s*(元|\d{1,2})\s*年\s*|(?<!\d)(\d{4})\s*年\s*)?(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日|(?<![\d.])(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})(?![\d.])/g;
const FISCAL_RE = /(?:(令和|平成)\s*(元|\d{1,2})|(?<!\d)(\d{4}))\s*年度/g;
const RANGE_GAP_RE = /^\s*(?:から|より|～|〜|~|-)\s*$/;
const WEEKDAY_RE = /^\s*\(\s*([日月火水木金土])\s*\)/;

function fiscalYears(n: string): { at: number; year: number }[] {
  return [...n.matchAll(FISCAL_RE)].map((m) => ({
    at: m.index,
    year: m[1] ? eraYear(m[1], m[2]) : Number(m[3]),
  }));
}

/** All dates in the letter, in order, plus "A から B まで" ranges. */
export function parseDates(text: string, opts: ExtractOptions = {}): { dates: DateMatch[]; ranges: DateRange[] } {
  const n = normalize(text);
  const fys = fiscalYears(n);
  const dates: DateMatch[] = [];
  const ranges: DateRange[] = [];
  let prev: DateMatch | undefined;

  for (const m of n.matchAll(DATE_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    const linked = prev && RANGE_GAP_RE.test(n.slice(prev.source.end, start).replace(WEEKDAY_RE, "")) ? prev : undefined;
    let date: string | undefined;
    let yearFrom: YearSource = "explicit";

    if (m[6]) {
      date = iso(Number(m[6]), Number(m[7]), Number(m[8]));
    } else {
      const month = Number(m[4]);
      const day = Number(m[5]);
      let year: number | undefined = m[1] ? eraYear(m[1], m[2]) : m[3] ? Number(m[3]) : undefined;
      if (year === undefined) {
        const fy = fys.filter((f) => f.at < start).at(-1);
        const ctx = dates.filter((d) => d.yearFrom === "explicit").at(-1);
        if (linked) {
          const [y, pm] = linked.date.split("-").map(Number);
          year = month < pm ? y + 1 : y;
          yearFrom = "range";
        } else if (fy) {
          year = month >= 4 ? fy.year : fy.year + 1;
          yearFrom = "fiscal_year";
        } else if (ctx) {
          year = Number(ctx.date.slice(0, 4));
          const candidate = iso(year, month, day);
          if (candidate && dayDiff(candidate, ctx.date) < -90) year += 1;
          yearFrom = "context";
        } else {
          year = (opts.today ?? new Date()).getFullYear();
          yearFrom = "today";
        }
      }
      date = iso(year, month, day);
    }
    if (!date) continue;

    const match: DateMatch = { date, source: quote(text, start, end), yearFrom };
    const wd = WEEKDAY_RE.exec(n.slice(end, end + 6));
    if (wd) {
      match.weekday = wd[1];
      match.weekdayOk = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] === wd[1];
    }
    if (linked) {
      const tail = /^\s*(?:\([日月火水木金土]\))?\s*まで/.exec(n.slice(end));
      ranges.push({ from: linked, to: match, source: quote(text, linked.source.start, end + (tail ? tail[0].length : 0)) });
    }
    dates.push(match);
    prev = match;
  }
  return { dates, ranges };
}

const NUM = String.raw`(\d{1,3}(?:,\d{3})+|\d+)`;
const AMOUNT_RES: { re: RegExp; value: (m: RegExpMatchArray) => number; labelled?: boolean }[] = [
  { re: new RegExp(String.raw`¥\s*${NUM}(?:\s*円)?`, "g"), value: (m) => num(m[1]) },
  { re: new RegExp(String.raw`(?<![\d,.])${NUM}\s*万\s*(?:${NUM}\s*)?円`, "g"), value: (m) => num(m[1]) * 10_000 + (m[2] ? num(m[2]) : 0) },
  { re: new RegExp(String.raw`(?<![\d,.])${NUM}\s*円`, "g"), value: (m) => num(m[1]) },
  { re: /無料/g, value: () => 0 },
];
const LABELLED_RE = new RegExp(String.raw`(?:金額|納付額|税額|保険料額)\s*[:]?\s*${NUM}(?![\d,.]|\s*[円万%人年月日件期号か])`, "g");

function num(s: string): number {
  return Number(s.replace(/,/g, ""));
}

/** All yen amounts: 12,300円 / ￥12,300 / １万２，３００円 / 無料 (0) / 金額 12,300 (labelled, no 円). */
export function parseAmounts(text: string): AmountMatch[] {
  const n = normalize(text);
  const found: AmountMatch[] = [];
  const overlaps = (s: number, e: number) => found.some((a) => s < a.source.end && e > a.source.start);
  for (const { re, value } of AMOUNT_RES) {
    for (const m of n.matchAll(re)) {
      const s = m.index;
      const e = s + m[0].length;
      if (!overlaps(s, e)) found.push({ value: value(m), source: quote(text, s, e) });
    }
  }
  for (const m of n.matchAll(LABELLED_RE)) {
    const e = m.index + m[0].length;
    const s = e - m[1].length;
    if (!overlaps(s, e)) found.push({ value: num(m[1]), source: quote(text, s, e), labelled: true });
  }
  return found.sort((a, b) => a.source.start - b.source.start);
}

/** Rows that start with 第N期 and carry a date and/or an amount on the same line. */
export function parseInstalments(text: string, dates: DateMatch[], amounts: AmountMatch[]): Instalment[] {
  const n = normalize(text);
  const rows: Instalment[] = [];
  let lineStart = 0;
  for (const line of n.split("\n")) {
    const lineEnd = lineStart + line.length;
    const m = /^\s*第\s*(\d{1,2})\s*期/.exec(line);
    if (m) {
      const inLine = <T extends { source: Quote }>(x: T) => x.source.start >= lineStart && x.source.end <= lineEnd;
      const deadline = dates.find(inLine);
      const amount = amounts.find(inLine);
      if (deadline || amount) {
        const lead = line.length - line.trimStart().length;
        const trail = line.length - line.trimEnd().length;
        rows.push({ period: Number(m[1]), deadline, amount, source: quote(text, lineStart + lead, lineEnd - trail) });
      }
    }
    lineStart = lineEnd + 1;
  }
  return rows;
}

export function extractFacts(text: string, opts: ExtractOptions = {}): Facts {
  const { dates, ranges } = parseDates(text, opts);
  const amounts = parseAmounts(text);
  return { dates, ranges, amounts, instalments: parseInstalments(text, dates, amounts) };
}

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
function lower(a: Confidence, b: Confidence): Confidence {
  return RANK[a] <= RANK[b] ? a : b;
}

/**
 * Check one action (typically from the LLM) against the letter. A deadline or amount that is not
 * in the text is dropped and the action becomes low confidence; a supported one gets the
 * extractor's quote. A date whose year had to be guessed caps confidence at medium (or low when
 * the guess came from today's date, or when the written weekday disagrees).
 */
export function validateAction(action: Action, facts: Facts): { action: Action; dropped: string[] } {
  const dropped: string[] = [];
  const out: Action = { ...action, how: [...action.how] };
  let confidence = action.confidence;

  if (action.deadline) {
    const hits = facts.dates.filter((d) => d.date === action.deadline!.date);
    const hit = hits.find((d) => overlapsQuote(d.source, action.deadline!.source)) ?? hits[0];
    if (!hit) {
      delete out.deadline;
      dropped.push(`deadline ${action.deadline.date} is not in the letter`);
      confidence = "low";
    } else {
      out.deadline = { date: hit.date, source: hit.source };
      if (hit.yearFrom === "today" || hit.weekdayOk === false) confidence = lower(confidence, "low");
      else if (hit.yearFrom === "context") confidence = lower(confidence, "medium");
    }
  }

  if (action.amountYen) {
    const hits = facts.amounts.filter((a) => a.value === action.amountYen!.value);
    const hit = hits.find((a) => overlapsQuote(a.source, action.amountYen!.source)) ?? hits[0];
    if (!hit) {
      delete out.amountYen;
      dropped.push(`amount ${action.amountYen.value} yen is not in the letter`);
      confidence = "low";
    } else {
      out.amountYen = { value: hit.value, source: hit.source };
      if (hit.labelled) confidence = lower(confidence, "medium");
    }
  }

  out.confidence = confidence;
  return { action: out, dropped };
}

function overlapsQuote(a: Quote, b: Quote | undefined): boolean {
  return !!b && a.start < b.end && a.end > b.start;
}
