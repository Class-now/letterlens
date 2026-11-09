// Client-side calendar export (RFC 5545). One all-day VEVENT per action that has a deadline,
// with a reminder 3 days before. Nothing is sent to the server: the browser builds the file.

import { GUIDANCE } from "./doc-types";
import type { Action, Analysis } from "./types";

const CRLF = "\r\n";
const MAX_OCTETS = 75;

/** Escape a TEXT value: backslash, semicolon, comma and newlines (RFC 5545 3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fold a content line at 75 octets (UTF-8), never splitting a character (RFC 5545 3.1). */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    // Continuation lines start with a space, which counts toward their 75 octets.
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join(CRLF + " ");
}

function compactDate(date: string): string {
  return date.replace(/-/g, "");
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Short stable hash so re-downloading the same deadline updates rather than duplicates it. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function formatYen(value: number): string {
  return `¥${value.toLocaleString("en-US")}`;
}

function describe(action: Action, japaneseTitle: string): string {
  const lines: string[] = [];
  if (action.amountYen) lines.push(`${formatYen(action.amountYen.value)} (${action.amountYen.source.text})`);
  if (action.deadline) lines.push(`期限 / Deadline: ${action.deadline.source.text}`);
  for (const step of action.how) lines.push(`- ${step}`);
  lines.push(japaneseTitle);
  lines.push("LetterLens — not legal advice. Check the original letter.");
  return lines.join("\n");
}

function vevent(action: Action, analysis: Analysis, now: Date): string[] {
  const deadline = action.deadline!;
  const japaneseTitle = GUIDANCE[analysis.docType].label.ja;
  const summary = `${action.title} (${japaneseTitle})`;
  const uid = `${compactDate(deadline.date)}-${hash(`${analysis.docType}|${deadline.date}|${action.title}`)}@letterlens`;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${compactDate(deadline.date)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDay(deadline.date))}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(describe(action, japaneseTitle))}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-P3D",
    `DESCRIPTION:${escapeText(summary)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

/** Build a calendar with the given actions (default: every action that has a deadline). */
export function buildIcs(analysis: Analysis, actions: Action[] = analysis.actions, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LetterLens//Letter deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...actions.filter((a) => a.deadline).flatMap((a) => vevent(a, analysis, now)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** File name for one action's download, e.g. letterlens-2026-06-30.ics. */
export function icsFilename(action?: Action): string {
  return action?.deadline ? `letterlens-${action.deadline.date}.ics` : "letterlens-deadlines.ics";
}
