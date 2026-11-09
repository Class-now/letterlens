import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine, icsFilename } from "../src/ics";
import type { Analysis } from "../src/types";

const root = join(import.meta.dirname, "..");
const expected = (name: string): Analysis =>
  JSON.parse(readFileSync(join(root, "samples", "expected", `${name}.json`), "utf8"));
const NOW = new Date("2026-11-10T03:04:05.678Z");
const octets = (s: string) => new TextEncoder().encode(s).length;

/** Undo RFC 5545 folding: a CRLF followed by one space or tab joins to the previous line. */
const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, "");

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeText("a\\b;c,d\ne\r\nf")).toBe("a\\\\b\\;c\\,d\\ne\\nf");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds at 75 octets and unfolds back to the original", () => {
    const line = `DESCRIPTION:${"x".repeat(200)}`;
    const folded = foldLine(line);
    for (const part of folded.split("\r\n")) expect(octets(part)).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(unfold(folded)).toBe(line);
  });

  it("never splits a multibyte character", () => {
    const line = `SUMMARY:${"納税通知書".repeat(20)}`;
    const folded = foldLine(line);
    for (const part of folded.split("\r\n")) {
      expect(octets(part)).toBeLessThanOrEqual(75);
      expect(part).not.toContain("�");
    }
    expect(unfold(folded)).toBe(line);
  });
});

describe("buildIcs", () => {
  const tax = expected("a-resident-tax");
  const ics = buildIcs(tax, tax.actions, NOW);
  const lines = unfold(ics).split("\r\n");

  it("is a CRLF calendar with only folded lines of at most 75 octets", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    for (const line of ics.split("\r\n")) expect(octets(line)).toBeLessThanOrEqual(75);
  });

  it("has one all-day event with a 3-day reminder per dated action", () => {
    const dated = tax.actions.filter((a) => a.deadline);
    expect(dated.length).toBeGreaterThan(1);
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(dated.length);
    expect(lines.filter((l) => l === "TRIGGER:-P3D")).toHaveLength(dated.length);
    const first = dated[0].deadline!.date.replace(/-/g, "");
    expect(lines).toContain(`DTSTART;VALUE=DATE:${first}`);
    expect(lines).toContain("DTSTAMP:20261110T030405Z");
  });

  it("puts the target-language title and the Japanese letter name in the summary", () => {
    const summary = lines.find((l) => l.startsWith("SUMMARY:"))!;
    expect(summary).toContain(escapeText(tax.actions[0].title));
    expect(summary).toContain("住民税の納税通知書");
  });

  it("describes the amount and how to pay, escaped", () => {
    const action = tax.actions.find((a) => a.deadline && a.amountYen)!;
    const ics1 = unfold(buildIcs(tax, [action], NOW));
    const description = ics1.split("\r\n").find((l) => l.startsWith("DESCRIPTION:"))!;
    expect(description).toContain(`¥${action.amountYen!.value.toLocaleString("en-US").replace(/,/g, "\\,")}`);
    expect(description).toContain("\\n- ");
    expect(description).not.toMatch(/(^|[^\\])[;]/);
  });

  it("ends an all-day event on the next day, across month ends", () => {
    const one = { ...tax, actions: [{ title: "Pay", deadline: { date: "2026-12-31", source: { text: "x", start: 0, end: 1 } }, how: [], confidence: "high" as const }] };
    const out = buildIcs(one, one.actions, NOW);
    expect(out).toContain("DTEND;VALUE=DATE:20270101");
  });

  it("gives stable UIDs so re-downloads update the same event", () => {
    const uids = (s: string) => s.split("\r\n").filter((l) => l.startsWith("UID:"));
    expect(uids(buildIcs(tax, tax.actions, NOW))).toEqual(uids(buildIcs(tax, tax.actions, new Date())));
    expect(new Set(uids(ics)).size).toBe(uids(ics).length);
  });

  it("skips actions without a deadline", () => {
    const none = { ...tax, actions: tax.actions.map(({ deadline: _d, ...rest }) => rest) };
    expect(buildIcs(none, none.actions, NOW)).not.toContain("BEGIN:VEVENT");
  });

  it("works for every sample", () => {
    for (const file of readdirSync(join(root, "samples", "expected"))) {
      const a = expected(file.replace(/\.json$/, ""));
      const out = buildIcs(a, a.actions, NOW);
      expect(out.split("\r\n").filter((l) => l === "BEGIN:VEVENT")).toHaveLength(a.actions.filter((x) => x.deadline).length);
    }
  });

  it("names files by deadline", () => {
    expect(icsFilename(tax.actions.find((a) => a.deadline))).toMatch(/^letterlens-\d{4}-\d{2}-\d{2}\.ics$/);
    expect(icsFilename()).toBe("letterlens-deadlines.ics");
  });
});

describe("privacy", () => {
  it("server code never logs (so letter text and request bodies are never logged)", () => {
    const files = readdirSync(join(root, "src"), { recursive: true }).map(String).filter((f) => f.endsWith(".ts"));
    for (const f of files) expect(readFileSync(join(root, "src", f), "utf8"), f).not.toMatch(/\bconsole\.\w+\s*\(/);
  });

  it("ships a /privacy page that explains processing", () => {
    const html = readFileSync(join(root, "public", "privacy.html"), "utf8");
    expect(html).toMatch(/not stored/i);
    expect(html).toContain("no-store");
    expect(readFileSync(join(root, "public", "index.html"), "utf8")).toContain('href="/privacy"');
  });
});
