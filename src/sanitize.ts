// Output hardening: every string the model writes is clipped and stripped of links, except links
// to official Japanese government domains.

const OFFICIAL_HOST = /(^|\.)(go\.jp|lg\.jp)$/i;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'）)]+/gi;

export function isOfficialUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith("www.") ? `https://${url}` : url);
    return u.protocol === "https:" && OFFICIAL_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

export function clean(value: unknown, max = 400): string {
  if (typeof value !== "string") return "";
  const text = value
    .replace(URL_RE, (u) => (isOfficialUrl(u) ? u : "[link removed]"))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    // Models sometimes write Vietnamese with loose combining accents (ô + ́), which renders broken.
    .replace(/[^\s̀-ͯ][̀-ͯ]+/g, (m) => m.normalize("NFC"))
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const ERA_BASE: Record<string, number> = { 令和: 2018, 平成: 1988, 昭和: 1925 };

/** Western years the letter itself supports: written as 2026, or as an era year (令和8年 → 2026). */
export function yearsInLetter(letter: string): Set<number> {
  const text = letter.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  const years = new Set<number>();
  for (const m of text.matchAll(/(?<!\d)(19|20)\d{2}(?!\d)/g)) years.add(Number(m[0]));
  for (const m of text.matchAll(/(令和|平成|昭和)\s*(元|\d{1,2})\s*年/g)) years.add(ERA_BASE[m[1]] + (m[2] === "元" ? 1 : Number(m[2])));
  return years;
}

/**
 * Removes sentences that mention a year the letter does not support (the writer once dated a
 * 令和8年度 notice "2024"). Returns the kept text and the years that were removed.
 */
export function dropUnsupportedYears(text: string, allowed: Set<number>): { text: string; removed: number[] } {
  const removed: number[] = [];
  // A full stop ends a sentence only before a space (so dots inside links and numbers do not split).
  const kept = text.split(/(?<=[.!?])\s+|(?<=[。！？])/).filter((sentence) => {
    // A four-digit number next to a currency mark is an amount (¥2000, 2000 yen), not a year.
    const bad = [...sentence.matchAll(/(?<![\d,.¥￥])(19|20)\d{2}(?![\d,]|\s*(?:yen|円|JPY))/gi)].map((m) => Number(m[0])).filter((y) => !allowed.has(y));
    removed.push(...bad);
    return bad.length === 0;
  });
  return removed.length ? { text: kept.join(" ").trim(), removed } : { text, removed };
}

export function cleanList(value: unknown, maxItems: number, maxLen = 300): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => clean(v, maxLen)).filter(Boolean).slice(0, maxItems);
}
