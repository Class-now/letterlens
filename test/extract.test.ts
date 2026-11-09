import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classify, GUIDANCE, HELP_LINKS } from "../src/doc-types";
import { extractFacts, normalize, parseAmounts, parseDates, validateAction } from "../src/extract";
import type { Action, Analysis, Quote } from "../src/types";

const today = new Date("2026-11-10T00:00:00Z");
const dates = (t: string) => parseDates(t, { today }).dates;

describe("normalize", () => {
  it("maps full-width digits and punctuation one to one", () => {
    const s = "令和８年９月２５日　２４，５００円（金）￥１２";
    const n = normalize(s);
    expect(n).toBe("令和8年9月25日　24,500円(金)¥12");
    expect(n.length).toBe(s.length);
  });
});

describe("parseDates", () => {
  it("reads Japanese era dates with the original span", () => {
    const t = "納期限　令和8年6月30日　24,900円";
    const [d] = dates(t);
    expect(d.date).toBe("2026-06-30");
    expect(d.yearFrom).toBe("explicit");
    expect(t.slice(d.source.start, d.source.end)).toBe("令和8年6月30日");
  });

  it("handles the 平成31 / 令和元 boundary", () => {
    expect(dates("平成31年4月30日").map((d) => d.date)).toEqual(["2019-04-30"]);
    expect(dates("令和元年5月1日").map((d) => d.date)).toEqual(["2019-05-01"]);
    expect(dates("令和1年5月1日").map((d) => d.date)).toEqual(["2019-05-01"]);
    // pre-printed forms kept using 平成 after the change of era
    expect(dates("平成31年5月1日").map((d) => d.date)).toEqual(["2019-05-01"]);
    expect(dates("平成30年12月31日").map((d) => d.date)).toEqual(["2018-12-31"]);
  });

  it("reads full-width digits and keeps the full-width span", () => {
    const t = "指定期限　令和８年９月２５日";
    const [d] = dates(t);
    expect(d.date).toBe("2026-09-25");
    expect(d.source.text).toBe("令和８年９月２５日");
    expect(t.slice(d.source.start, d.source.end)).toBe(d.source.text);
  });

  it("reads western dates in 年月日 and slash form", () => {
    expect(dates("2026年6月30日まで").map((d) => d.date)).toEqual(["2026-06-30"]);
    expect(dates("期限 2027/1/5 必着").map((d) => d.date)).toEqual(["2027-01-05"]);
    expect(dates("２０２６年１２月１日").map((d) => d.date)).toEqual(["2026-12-01"]);
  });

  it("allows spaces inside a date", () => {
    expect(dates("令和 8 年 6 月 30 日").map((d) => d.date)).toEqual(["2026-06-30"]);
  });

  it("rejects impossible dates and phone or reference numbers", () => {
    expect(dates("令和8年2月30日")).toEqual([]);
    expect(dates("通知書番号 2026-0451-7782 電話 03-0000-0000")).toEqual([]);
    expect(dates("13月1日")).toEqual([]);
  });

  it("infers the year of a month-day from the fiscal year (April to March)", () => {
    const t = "令和8年度 国民健康保険料\n第1期　6月30日(火)　8,700円\n第8期　2月1日(月)　8,700円";
    const ds = dates(t);
    expect(ds.map((d) => d.date)).toEqual(["2026-06-30", "2027-02-01"]);
    expect(ds.every((d) => d.yearFrom === "fiscal_year")).toBe(true);
    expect(ds.map((d) => [d.weekday, d.weekdayOk])).toEqual([["火", true], ["月", true]]);
    expect(ds[0].source.text).toBe("6月30日");
  });

  it("flags a weekday that does not match the date", () => {
    const [d] = dates("令和8年6月30日（水）");
    expect(d.weekday).toBe("水");
    expect(d.weekdayOk).toBe(false);
  });

  it("infers a month-day year from a nearby full date, rolling into the next year", () => {
    const ds = dates("発行日 令和8年12月10日\n期限 1月15日");
    expect(ds[1]).toMatchObject({ date: "2027-01-15", yearFrom: "context" });
    const past = dates("発行日 令和8年12月10日\n11月30日の納期限");
    expect(past[1]).toMatchObject({ date: "2026-11-30", yearFrom: "context" });
  });

  it("falls back to today's year and says so", () => {
    expect(dates("6月30日まで")[0]).toMatchObject({ date: "2026-06-30", yearFrom: "today" });
  });

  it("rolls a today-based month-day into next year when that is nearer (December letter, January deadline)", () => {
    const dec = new Date("2026-12-15T00:00:00Z");
    expect(parseDates("国民健康保険料 納入通知書\n納期限 1月5日", { today: dec }).dates[0]).toMatchObject({
      date: "2027-01-05",
      yearFrom: "today",
    });
  });

  it("prefers an explicit date written after the 年度 heading over the fiscal year", () => {
    const ds = dates("令和7年度 国民健康保険料 督促状\n発行日 令和8年5月1日\n指定期限 5月20日");
    expect(ds[1]).toMatchObject({ date: "2026-05-20", yearFrom: "context" });
    // The fiscal year still decides when it is the nearer anchor.
    const fy = dates("発行日 令和8年4月1日\n令和8年度 住民税\n第4期 1月31日");
    expect(fy[1]).toMatchObject({ date: "2027-01-31", yearFrom: "fiscal_year" });
  });

  it("reads ranges like 6月1日から6月30日まで", () => {
    const t = "受付期間　令和8年6月1日から6月30日まで";
    const { dates: ds, ranges } = parseDates(t, { today });
    expect(ds.map((d) => d.date)).toEqual(["2026-06-01", "2026-06-30"]);
    expect(ds[1].yearFrom).toBe("range");
    expect(ranges).toHaveLength(1);
    expect(ranges[0].source.text).toBe("令和8年6月1日から6月30日まで");
  });

  it("carries a range across the new year and across weekdays and 〜", () => {
    const { ranges } = parseDates("令和8年12月1日(火)〜1月31日(日)", { today });
    expect([ranges[0].from.date, ranges[0].to.date]).toEqual(["2026-12-01", "2027-01-31"]);
    const income = parseDates("令和7年1月1日から12月31日までの所得", { today });
    expect(income.dates.map((d) => d.date)).toEqual(["2025-01-01", "2025-12-31"]);
  });
});

describe("parseAmounts", () => {
  const values = (t: string) => parseAmounts(t).map((a) => a.value);

  it("reads 円 amounts with commas", () => {
    const t = "年税額 98,400円";
    const [a] = parseAmounts(t);
    expect(a.value).toBe(98400);
    expect(t.slice(a.source.start, a.source.end)).toBe("98,400円");
  });

  it("reads yen-sign, full-width and 万 amounts", () => {
    expect(values("￥12,300")).toEqual([12300]);
    expect(values("¥ 5000円")).toEqual([5000]);
    expect(values("未納税額　２４，５００円")).toEqual([24500]);
    expect(values("1万2,300円")).toEqual([12300]);
    expect(values("3万円")).toEqual([30000]);
  });

  it("reads free (無料) as 0 and 0円", () => {
    expect(values("手数料は無料です")).toEqual([0]);
    expect(values("督促手数料　０円")).toEqual([0]);
  });

  it("reads a labelled amount without 円 but not counts or percentages", () => {
    const [a] = parseAmounts("金額 12,300");
    expect(a).toMatchObject({ value: 12300, labelled: true });
    expect(a.source.text).toBe("12,300");
    expect(values("税額 2人")).toEqual([]);
    expect(values("年2.4%")).toEqual([]);
  });

  it("does not read dates, phone numbers or percentages as amounts", () => {
    expect(values("令和8年6月30日 電話 03-0000-0000 年8.7%")).toEqual([]);
  });
});

describe("instalments", () => {
  it("reads 第N期 rows with their date and amount, ignoring prose that mentions 第1期", () => {
    const t =
      "令和8年度\n期別　納期限　納付額\n第1期　令和8年6月30日　24,900円\n第2期　令和8年8月31日　24,500円\n一括で納付する場合は、第1期の納期限（令和8年6月30日）までに";
    const rows = extractFacts(t, { today }).instalments;
    expect(rows.map((r) => [r.period, r.deadline?.date, r.amount?.value])).toEqual([
      [1, "2026-06-30", 24900],
      [2, "2026-08-31", 24500],
    ]);
    expect(rows[0].source.text).toBe("第1期　令和8年6月30日　24,900円");
  });

  it("reads full-width 第１０期", () => {
    const rows = extractFacts("令和8年度\n第１０期　３月３１日(水)　８，７００円", { today }).instalments;
    expect(rows.map((r) => [r.period, r.deadline?.date, r.amount?.value])).toEqual([[10, "2027-03-31", 8700]]);
  });
});

describe("validateAction", () => {
  const t = "令和8年度\n第1期　令和8年6月30日　24,900円";
  const facts = extractFacts(t, { today });
  const q = (text: string): Quote => ({ text, start: 0, end: 0 });
  const base: Action = { title: "Pay", how: [], confidence: "high" };

  it("keeps supported facts and replaces quotes with the letter's span", () => {
    const { action, dropped } = validateAction(
      { ...base, deadline: { date: "2026-06-30", source: q("x") }, amountYen: { value: 24900, source: q("x") } },
      facts,
    );
    expect(dropped).toEqual([]);
    expect(action.confidence).toBe("high");
    expect(action.deadline?.source.text).toBe("令和8年6月30日");
    expect(action.amountYen?.source.text).toBe("24,900円");
  });

  it("drops a hallucinated date and amount and marks the action low confidence", () => {
    const { action, dropped } = validateAction(
      { ...base, deadline: { date: "2026-07-15", source: q("x") }, amountYen: { value: 99999, source: q("x") } },
      facts,
    );
    expect(action.deadline).toBeUndefined();
    expect(action.amountYen).toBeUndefined();
    expect(action.confidence).toBe("low");
    expect(dropped).toHaveLength(2);
  });

  it("ties a repeated amount to the instalment row of its own deadline", () => {
    const rows = "令和8年度\n第2期　令和8年8月31日　24,500円\n第3期　令和8年10月31日　24,500円\n第4期　令和9年1月31日　24,500円";
    const f = extractFacts(rows, { today });
    const first = rows.indexOf("24,500円");
    for (const [date, line] of [
      ["2026-10-31", "第3期"],
      ["2027-01-31", "第4期"],
    ] as const) {
      const { action } = validateAction(
        { ...base, deadline: { date, source: q("x") }, amountYen: { value: 24500, source: { text: "24,500円", start: first, end: first + 7 } } },
        f,
      );
      const lineStart = rows.indexOf(line);
      const lineEnd = rows.indexOf("\n", lineStart) === -1 ? rows.length : rows.indexOf("\n", lineStart);
      expect(action.amountYen!.source.start, line).toBeGreaterThan(lineStart);
      expect(action.amountYen!.source.end, line).toBeLessThanOrEqual(lineEnd);
    }
  });

  it("caps confidence when the year was guessed", () => {
    const f = extractFacts("6月30日まで", { today });
    const { action } = validateAction({ ...base, deadline: { date: "2026-06-30", source: q("x") } }, f);
    expect(action.confidence).toBe("low");
  });
});

describe("classify", () => {
  it("knows each type and prefers a reminder title over the tax it reminds about", () => {
    expect(classify("令和8年度 特別区民税・都民税 納税通知書").docType).toBe("resident_tax");
    expect(classify("令和8年度 市民税・県民税 納税通知書").docType).toBe("resident_tax");
    expect(classify("国民健康保険税 納税通知書\n国民健康保険").docType).toBe("health_insurance");
    expect(classify("国民年金保険料 学生納付特例制度").docType).toBe("pension_student");
    expect(classify("マイナンバーカードの電子証明書").docType).toBe("mynumber_renewal");
    expect(classify("督促状\n特別区民税・都民税 普通徴収 指定期限").docType).toBe("reminder");
  });

  it("returns unknown for unrelated text", () => {
    expect(classify("本日は晴天なり。").docType).toBe("unknown");
  });

  it("has guidance with official links only", () => {
    for (const g of Object.values(GUIDANCE)) {
      expect(g.how.length).toBeGreaterThan(0);
      for (const l of [...g.links, ...HELP_LINKS]) expect(new URL(l.url).hostname).toMatch(/\.(go|lg)\.jp$/);
    }
  });
});

describe("samples match samples/expected", () => {
  const dir = join(import.meta.dirname, "..", "samples");
  const names = readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => f.replace(/\.txt$/, ""));
  const contains = (outer: Quote, inner: Quote) => inner.start >= outer.start && inner.end <= outer.end;

  for (const name of names) {
    it(name, () => {
      const text = readFileSync(join(dir, `${name}.txt`), "utf8");
      const expected: Analysis = JSON.parse(readFileSync(join(dir, "expected", `${name}.json`), "utf8"));
      const facts = extractFacts(text, { today });

      expect(classify(text).docType).toBe(expected.docType);
      for (const d of facts.dates) if (d.weekday) expect(d.weekdayOk).toBe(true);

      for (const a of expected.actions) {
        if (a.deadline) {
          const hit = facts.dates.find((d) => d.date === a.deadline!.date && contains(a.deadline!.source, d.source));
          expect(hit, `${a.title}: ${a.deadline.date}`).toBeDefined();
        }
        if (a.amountYen) {
          const hit = facts.amounts.find((x) => x.value === a.amountYen!.value && contains(a.amountYen!.source, x.source));
          expect(hit, `${a.title}: ${a.amountYen.value}`).toBeDefined();
        }
        // the expected answer survives validation unchanged
        const { action, dropped } = validateAction(a, facts);
        expect(dropped).toEqual([]);
        expect(action.confidence).toBe(a.confidence);
        expect(action.deadline?.date).toBe(a.deadline?.date);
        expect(action.amountYen?.value).toBe(a.amountYen?.value);
      }

      // instalment letters: the 第N期 table is exactly the expected action list
      if (facts.instalments.length > 0) {
        expect(facts.instalments.map((r) => [r.deadline?.date, r.amount?.value])).toEqual(
          expected.actions.map((a) => [a.deadline?.date, a.amountYen?.value]),
        );
      }
    });
  }

  it("finds the instalment tables of the two instalment letters", () => {
    const count = (n: string) => extractFacts(readFileSync(join(dir, `${n}.txt`), "utf8"), { today }).instalments.length;
    expect(count("a-resident-tax")).toBe(4);
    expect(count("b-health-insurance")).toBe(10);
    expect(count("e-tax-reminder")).toBe(0);
  });
});
