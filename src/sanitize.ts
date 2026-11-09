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
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function cleanList(value: unknown, maxItems: number, maxLen = 300): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => clean(v, maxLen)).filter(Boolean).slice(0, maxItems);
}
