import { describe, expect, it } from "vitest";
import { clean, dropUnsupportedYears, yearsInLetter } from "../src/sanitize";

describe("yearsInLetter", () => {
  it("reads western and era years, including full-width digits and 元年", () => {
    const years = yearsInLetter("令和8年度 納税通知書 発行日 令和８年6月10日 平成31年 令和元年 2027年2月1日");
    expect([...years].sort()).toEqual([2019, 2026, 2027]);
  });
});

describe("dropUnsupportedYears", () => {
  const allowed = new Set([2026, 2027]);

  it("removes a sentence that names a year the letter does not have", () => {
    const r = dropUnsupportedYears("This is your insurance bill for 2024. Pay each instalment by its deadline.", allowed);
    expect(r).toEqual({ text: "Pay each instalment by its deadline.", removed: [2024] });
  });

  it("keeps supported years and amounts that look like years", () => {
    const text = "The bill for fiscal year 2026 is ¥2000 per month, or 2000 yen at the counter. The last deadline is in 2027.";
    expect(dropUnsupportedYears(text, allowed)).toEqual({ text, removed: [] });
  });

  it("handles Japanese sentence ends", () => {
    const r = dropUnsupportedYears("2024年度の保険料です。期限までに払ってください。", allowed);
    expect(r.text).toBe("期限までに払ってください。");
  });
});

describe("clean", () => {
  it("composes loose combining accents (Vietnamese)", () => {
    const loose = "Quốc dân thành phố";
    expect(clean(loose)).toBe("Quốc dân thành phố");
  });

  it("leaves Japanese text unchanged", () => {
    expect(clean("特別区民税・都民税 納税通知書（普通徴収）")).toBe("特別区民税・都民税 納税通知書（普通徴収）");
  });
});
