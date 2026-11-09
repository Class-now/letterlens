import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countdown, daysUntil, errorMessage, splitAtQuote, t, uiLangOf, yen } from "../src/web/format";

describe("web format helpers", () => {
  const today = new Date(2026, 10, 10); // 2026-11-10 local

  it("counts calendar days to a deadline", () => {
    expect(daysUntil("2026-11-10", today)).toBe(0);
    expect(daysUntil("2026-11-22", today)).toBe(12);
    expect(daysUntil("2027-02-01", today)).toBe(83);
    expect(daysUntil("2026-11-02", today)).toBe(-8);
  });

  it("phrases the countdown in English and Japanese", () => {
    expect(countdown("2026-11-22", today, "en")).toEqual({ text: "in 12 days", overdue: false });
    expect(countdown("2026-11-11", today, "en").text).toBe("in 1 day");
    expect(countdown("2026-11-10", today, "en").text).toBe("due today");
    expect(countdown("2026-11-02", today, "en")).toEqual({ text: "8 days overdue", overdue: true });
    expect(countdown("2026-11-22", today, "ja").text).toBe("あと 12 日");
    expect(countdown("2026-11-02", today, "ja")).toEqual({ text: "8 日過ぎています", overdue: true });
  });

  it("formats yen", () => {
    expect(yen(24900)).toBe("¥24,900");
  });

  it("splits text at a quote, falling back to search when offsets are stale", () => {
    const text = "納期限 令和8年6月30日 24,900円";
    expect(splitAtQuote(text, { text: "令和8年6月30日", start: 4, end: 13 })).toEqual(["納期限 ", "令和8年6月30日", " 24,900円"]);
    expect(splitAtQuote(text, { text: "24,900円", start: 0, end: 7 })).toEqual(["納期限 令和8年6月30日 ", "24,900円", ""]);
    expect(splitAtQuote(text, { text: "存在しない", start: 0, end: 5 })).toBeUndefined();
  });

  it("uses Japanese chrome only for easy Japanese", () => {
    expect(uiLangOf("ja-easy")).toBe("ja");
    expect(uiLangOf("vi")).toBe("en");
    expect(t("todo", "ja")).toBe("やること");
  });

  it("maps API error codes to messages", () => {
    expect(errorMessage("ocr_unavailable", "en")).toMatch(/paste the text/);
    expect(errorMessage("rate_limited", "en")).toMatch(/wait/);
    expect(errorMessage("weird", "en")).toBe("Something went wrong (weird)");
  });

  it("every data-i18n key in index.html has a string", () => {
    const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
    const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) expect(() => t(key as never, "en")).not.toThrow();
  });

  it("app.js never renders letter data with innerHTML", () => {
    const src = readFileSync(new URL("../src/web/app.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML\(/);
  });
});
