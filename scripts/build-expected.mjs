// Builds samples/expected/*.json from the hand-checked facts below.
// The facts (dates, amounts, wording) are written by hand from each letter; this script only
// computes the character offsets of every quoted span so they always match samples/*.txt.
// Run: node scripts/build-expected.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samplesDir = join(root, "samples");

function quoter(text, file) {
  // q(span, anchor?) -> {text, start, end}; anchor picks the first match at or after the anchor.
  return (span, anchor) => {
    let from = 0;
    if (anchor) {
      from = text.indexOf(anchor);
      if (from < 0) throw new Error(`${file}: anchor not found: ${anchor}`);
    }
    const start = text.indexOf(span, from);
    if (start < 0) throw new Error(`${file}: span not found: ${span} (anchor ${anchor ?? "-"})`);
    return { text: span, start, end: start + span.length };
  };
}

const samples = {
  "a-resident-tax": (q) => ({
    docType: "resident_tax",
    sender: "Shibuya City Office, Tax Division (渋谷区 区民部 税務課)",
    summary:
      "This is your resident tax bill for fiscal year 2026 (Shibuya ward tax and Tokyo metropolitan tax). The total is 98,400 yen, paid in 4 instalments or all at once by June 30, 2026.",
    actions: [
      ["1st", "令和8年6月30日", "2026-06-30", "24,900円", 24900, "第1期　"],
      ["2nd", "令和8年8月31日", "2026-08-31", "24,500円", 24500, "第2期　"],
      ["3rd", "令和8年11月2日", "2026-11-02", "24,500円", 24500, "第3期　"],
      ["4th", "令和9年2月1日", "2027-02-01", "24,500円", 24500, "第4期　"],
    ].map(([nth, dateJa, date, amountJa, value, anchor]) => ({
      title: `Pay the ${nth} instalment of resident tax`,
      deadline: { date, source: q(dateJa, anchor) },
      amountYen: { value, source: q(amountJa, anchor) },
      how: [
        "Pay with the enclosed payment slip at a bank, post office bank (Japan Post Bank), convenience store, or the Shibuya City Office tax counter",
        "Or pay with a smartphone payment app by scanning the slip's barcode, or online at the eLTAX payment site",
      ],
      confidence: "high",
    })),
    consequences: [
      {
        text: "If you do not pay by the deadline, you will receive a reminder letter (督促状) and late fees (延滞金) may be charged for each day after the deadline.",
        source: q("納期限までに納付がない場合は、督促状を送付します。"),
      },
    ],
    glossary: [
      { term: "納税通知書", reading: "のうぜいつうちしょ", meaning: "tax notice / tax bill" },
      { term: "特別区民税・都民税", reading: "とくべつくみんぜい・とみんぜい", meaning: "resident tax paid to your Tokyo ward and to Tokyo" },
      { term: "普通徴収", reading: "ふつうちょうしゅう", meaning: "you pay the tax yourself (not deducted from salary)" },
      { term: "納期限", reading: "のうきげん", meaning: "payment deadline" },
      { term: "第1期", reading: "だいいっき", meaning: "1st instalment" },
      { term: "延滞金", reading: "えんたいきん", meaning: "late payment charge" },
      { term: "口座振替", reading: "こうざふりかえ", meaning: "automatic bank debit" },
    ],
    warnings: [],
    language: "en",
  }),

  "b-health-insurance": (q) => {
    const rows = [
      ["6月30日(火)", "2026-06-30"],
      ["7月31日(金)", "2026-07-31"],
      ["8月31日(月)", "2026-08-31"],
      ["9月30日(水)", "2026-09-30"],
      ["11月2日(月)", "2026-11-02"],
      ["11月30日(月)", "2026-11-30"],
      ["12月28日(月)", "2026-12-28"],
      ["2月1日(月)", "2027-02-01"],
      ["3月1日(月)", "2027-03-01"],
      ["3月31日(水)", "2027-03-31"],
    ];
    return {
      docType: "health_insurance",
      sender: "Shibuya City Office, National Health Insurance Division (渋谷区 区民部 国民健康保険課)",
      summary:
        "This is your National Health Insurance premium notice for fiscal year 2026. The yearly premium is 87,000 yen, paid in 10 instalments of 8,700 yen from June 2026 to March 2027.",
      actions: rows.map(([dateJa, date], i) => {
        const anchor = `第${i + 1}期　`;
        return {
          title: `Pay health insurance premium, instalment ${i + 1} of 10`,
          deadline: { date, source: q(dateJa.replace(/\(.\)$/, ""), anchor) },
          amountYen: { value: 8700, source: q("8,700円", anchor) },
          how: [
            "Pay with the enclosed payment slip at a bank, convenience store, or the city office counter",
            "Or pay with a smartphone payment app, or set up automatic bank debit",
          ],
          confidence: "high",
        };
      }),
      consequences: [
        {
          text: "If you fall behind on payments, you may get an insurance certificate valid for a shorter period, or you may have to pay the full medical cost first.",
          source: q("保険料を滞納すると、"),
        },
      ],
      glossary: [
        { term: "国民健康保険料", reading: "こくみんけんこうほけんりょう", meaning: "National Health Insurance premium" },
        { term: "納入通知書", reading: "のうにゅうつうちしょ", meaning: "payment notice" },
        { term: "世帯主", reading: "せたいぬし", meaning: "head of household" },
        { term: "資格確認書", reading: "しかくかくにんしょ", meaning: "insurance eligibility certificate (used instead of the old insurance card)" },
        { term: "軽減", reading: "けいげん", meaning: "reduction (of the premium)" },
        { term: "申告", reading: "しんこく", meaning: "income declaration" },
      ],
      warnings: [
        "If your income is low, the premium may be reduced. If you have not declared last year's income, declare it at the city office.",
      ],
      language: "en",
    };
  },

  "c-pension-student": (q) => ({
    docType: "pension_student",
    sender: "Japan Pension Service, Shibuya Pension Office (日本年金機構 渋谷年金事務所)",
    summary:
      "This letter explains the Student Payment Special Exemption for the National Pension. If you are a student with low income, you can apply to postpone paying the pension premium (17,920 yen per month) for April 2026 to March 2027.",
    actions: [
      {
        title: "Submit the Student Payment Special Exemption application",
        deadline: { date: "2026-05-29", source: q("令和8年5月29日（金）") },
        how: [
          "Fill in the enclosed application form and attach a copy of your student ID (both sides) or a certificate of enrollment",
          "Send it by mail to the Shibuya Pension Office with the return envelope, bring it to the National Pension counter at Shibuya City Office, or apply online via Mynaportal",
        ],
        confidence: "high",
      },
    ],
    consequences: [
      {
        text: "If you neither apply nor pay, the months become unpaid, and you may not receive the disability or survivors' basic pension if something happens to you.",
        source: q("申請をせずに保険料を納めない場合は未納となり"),
      },
      {
        text: "If you stay unpaid, you may receive reminders, late fees may be charged, and your property may be seized.",
        source: q("未納が続くと督促を行い"),
      },
    ],
    glossary: [
      { term: "国民年金", reading: "こくみんねんきん", meaning: "National Pension" },
      { term: "学生納付特例", reading: "がくせいのうふとくれい", meaning: "special exemption that lets students postpone pension payments" },
      { term: "第1号被保険者", reading: "だいいちごうひほけんしゃ", meaning: "category 1 insured person (students, self-employed, unemployed)" },
      { term: "申請書", reading: "しんせいしょ", meaning: "application form" },
      { term: "在学証明書", reading: "ざいがくしょうめいしょ", meaning: "certificate of enrollment" },
      { term: "追納", reading: "ついのう", meaning: "paying the postponed premiums later" },
      { term: "未納", reading: "みのう", meaning: "unpaid" },
    ],
    warnings: [
      "Months approved for the exemption can be paid later (within 10 years) so that they count fully toward your pension.",
    ],
    language: "en",
  }),

  "d-mynumber-renewal": (q) => ({
    docType: "mynumber_renewal",
    sender: "Shibuya City Office, Family Register and Resident Records Division (渋谷区 戸籍住民課) / J-LIS",
    summary:
      "The electronic certificates on your My Number Card expire on January 15, 2027. Renew them for free at Shibuya City Office before then.",
    actions: [
      {
        title: "Renew the electronic certificates on your My Number Card",
        deadline: { date: "2027-01-15", source: q("令和9年1月15日") },
        amountYen: { value: 0, source: q("手数料は無料です") },
        how: [
          "Go in person to the Family Register and Resident Records counter (戸籍住民課) at Shibuya City Office, weekdays 8:30 to 17:00",
          "Bring your My Number Card, this notice, and your card PINs (a 4-digit number and a 6–16 character alphanumeric password)",
        ],
        confidence: "high",
      },
    ],
    consequences: [
      {
        text: "After the expiry date you cannot use the card as a health insurance card, get certificates at convenience stores, log in to Mynaportal, or file online (e-Tax).",
        source: q("有効期限が過ぎると、"),
      },
    ],
    glossary: [
      { term: "電子証明書", reading: "でんししょうめいしょ", meaning: "electronic certificate (digital ID stored on the card)" },
      { term: "有効期限", reading: "ゆうこうきげん", meaning: "expiry date" },
      { term: "暗証番号", reading: "あんしょうばんごう", meaning: "PIN / password" },
      { term: "戸籍住民課", reading: "こせきじゅうみんか", meaning: "resident records division of the city office" },
      { term: "在留期間", reading: "ざいりゅうきかん", meaning: "period of stay (on your residence card)" },
    ],
    warnings: [
      "Your My Number Card itself expires on the same day as your period of stay. If you extend your status, change the card's validity within 14 days.",
    ],
    language: "en",
  }),

  "e-tax-reminder": (q) => ({
    docType: "reminder",
    sender: "Shibuya City Office, Tax Division, Collection Section (渋谷区 区民部 税務課 収納係)",
    summary:
      "This is a payment reminder (督促状). The 2nd instalment of your fiscal 2026 resident tax, 24,500 yen, was due on August 31, 2026 and has not been paid. Pay it by September 25, 2026.",
    actions: [
      {
        title: "Pay the overdue 2nd instalment of resident tax",
        deadline: { date: "2026-09-25", source: q("令和８年９月２５日", "指定期限　") },
        amountYen: { value: 24500, source: q("２４，５００円") },
        how: [
          "Pay with the enclosed payment slip at a bank, convenience store, or the Shibuya City Office tax counter",
          "If paying is difficult, contact the Collection Section before the deadline to ask about paying in parts",
        ],
        confidence: "high",
      },
    ],
    consequences: [
      {
        text: "Late fees are added from the day after the original deadline: 2.4% per year for the first month, then 8.7% per year. The amount will be sent to you later.",
        source: q("延滞金の割合は、"),
      },
      {
        text: "If you do not pay by the deadline, the city may seize property such as your salary or bank savings under the Local Tax Act.",
        source: q("指定期限までに納付がない場合は、"),
      },
    ],
    glossary: [
      { term: "督促状", reading: "とくそくじょう", meaning: "payment reminder / demand letter" },
      { term: "指定期限", reading: "していきげん", meaning: "new deadline set in this reminder" },
      { term: "未納税額", reading: "みのうぜいがく", meaning: "unpaid tax amount" },
      { term: "延滞金", reading: "えんたいきん", meaning: "late payment charge" },
      { term: "差押え", reading: "さしおさえ", meaning: "seizure of property" },
      { term: "滞納処分", reading: "たいのうしょぶん", meaning: "enforcement action for unpaid tax" },
    ],
    warnings: ["If you already paid, you can ignore this reminder (the letters crossed in the mail)."],
    language: "en",
  }),
};

mkdirSync(join(samplesDir, "expected"), { recursive: true });
for (const [name, build] of Object.entries(samples)) {
  const file = `${name}.txt`;
  const text = readFileSync(join(samplesDir, file), "utf8");
  const analysis = build(quoter(text, file));
  writeFileSync(join(samplesDir, "expected", `${name}.json`), JSON.stringify(analysis, null, 2) + "\n");
  console.log(`wrote expected/${name}.json (${analysis.actions.length} actions)`);
}
