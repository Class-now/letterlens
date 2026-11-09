// Keyword classifier for the letter types LetterLens knows, plus static per-type guidance
// (where to go, how to pay, official multilingual links). Every link is an official .go.jp /
// .lg.jp page, checked on 2026-11-10.
import type { DocType } from "./types";

export type Link = { title: string; url: string };

export type Guidance = {
  label: { en: string; ja: string };
  office: string;
  how: string[];
  links: Link[];
};

// Weight per keyword; a keyword found in the first two non-empty lines (the title) counts double.
const KEYWORDS: Record<Exclude<DocType, "unknown">, [string, number][]> = {
  resident_tax: [
    ["住民税", 3], ["特別区民税", 3], ["市民税", 3], ["区民税", 2], ["町民税", 3], ["村民税", 3],
    ["都民税", 2], ["道民税", 2], ["府民税", 2], ["県民税", 2], ["納税通知書", 3], ["普通徴収", 2],
  ],
  health_insurance: [
    ["国民健康保険料", 4], ["国民健康保険税", 4], ["国民健康保険", 2], ["国保", 2], ["納入通知書", 1],
  ],
  pension_student: [
    ["学生納付特例", 5], ["国民年金", 3], ["年金事務所", 2], ["日本年金機構", 2], ["基礎年金番号", 2],
  ],
  mynumber_renewal: [
    ["有効期限通知書", 4], ["マイナンバーカード", 3], ["個人番号カード", 2], ["電子証明書", 3], ["J-LIS", 1],
  ],
  reminder: [
    ["督促状", 6], ["督促", 2], ["催告書", 6], ["指定期限", 3], ["未納税額", 2], ["滞納処分", 2],
  ],
};

const MIN_SCORE = 3;

export type Classification = { docType: DocType; score: number; matched: string[] };

export function classify(text: string): Classification {
  const title = text.split("\n").filter((l) => l.trim()).slice(0, 2).join("\n");
  let best: Classification = { docType: "unknown", score: 0, matched: [] };
  for (const [docType, words] of Object.entries(KEYWORDS) as [DocType, [string, number][]][]) {
    let score = 0;
    const matched: string[] = [];
    for (const [word, weight] of words) {
      if (!text.includes(word)) continue;
      score += title.includes(word) ? weight * 2 : weight;
      matched.push(word);
    }
    if (score > best.score) best = { docType, score, matched };
  }
  return best.score >= MIN_SCORE ? best : { docType: "unknown", score: best.score, matched: best.matched };
}

export const HELP_LINKS: Link[] = [
  { title: "Foreign Residents Support Center (FRESC), Immigration Services Agency", url: "https://www.moj.go.jp/isa/support/fresc/fresc01.html" },
  { title: "Guidebook on Living and Working (multilingual), Immigration Services Agency", url: "https://www.moj.go.jp/isa/support/portal/guidebook_all.html" },
];

export const GUIDANCE: Record<DocType, Guidance> = {
  resident_tax: {
    label: { en: "Resident tax bill", ja: "住民税の納税通知書" },
    office: "The tax division (税務課) of the city or ward office that sent the letter",
    how: [
      "Pay with the enclosed payment slip at a bank, Japan Post Bank, convenience store or the city office",
      "Many cities accept smartphone payment apps (scan the slip's barcode) and the eLTAX online payment site",
      "If paying is difficult, talk to the tax division before the deadline",
    ],
    links: [
      { title: "Individual resident tax, Tokyo Metropolitan Government Bureau of Taxation", url: "https://www.tax.metro.tokyo.lg.jp/kazei/kojin_ju.html" },
      { title: "eLTAX local tax online payment", url: "https://www.payment.eltax.lta.go.jp/" },
    ],
  },
  health_insurance: {
    label: { en: "National Health Insurance premium notice", ja: "国民健康保険料の納入通知書" },
    office: "The National Health Insurance division (国民健康保険課) of the city or ward office",
    how: [
      "Pay with the enclosed payment slip at a bank, convenience store or the city office, or set up automatic bank debit",
      "If your income dropped or you lost your job, ask the office about premium reductions",
    ],
    links: [
      { title: "National Health Insurance, Ministry of Health, Labour and Welfare", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/koukikourei/index_00002.html" },
    ],
  },
  pension_student: {
    label: { en: "National Pension student exemption notice", ja: "国民年金 学生納付特例のご案内" },
    office: "The pension office (年金事務所) or the National Pension counter (国民年金係) at the city office",
    how: [
      "Send the application form with a copy of your student ID or certificate of enrollment by mail, at the city office, or online via Mynaportal",
    ],
    links: [
      { title: "Exemption and postponement of National Pension premiums, Japan Pension Service", url: "https://www.nenkin.go.jp/service/kokunen/menjo/index.html" },
      { title: "Japan Pension Service in other languages", url: "https://www.nenkin.go.jp/international/index.html" },
    ],
  },
  mynumber_renewal: {
    label: { en: "My Number Card certificate expiry notice", ja: "マイナンバーカード 電子証明書の有効期限通知" },
    office: "The resident records counter (戸籍住民課 / 市民課) of the city or ward office",
    how: [
      "Go to the city office in person with your My Number Card, the notice and your PINs; renewal of the certificates is free",
    ],
    links: [
      { title: "My Number Card portal site (J-LIS)", url: "https://www.kojinbango-card.go.jp/" },
      { title: "My Number system, Digital Agency", url: "https://www.digital.go.jp/policies/mynumber" },
    ],
  },
  reminder: {
    label: { en: "Payment reminder", ja: "督促状" },
    office: "The collection section (収納係) named on the letter",
    how: [
      "Pay the unpaid amount by the new deadline with the enclosed slip",
      "If you already paid, keep your receipt; if paying is difficult, call the office before the deadline to ask about instalments",
    ],
    links: [
      { title: "eLTAX local tax online payment", url: "https://www.payment.eltax.lta.go.jp/" },
    ],
  },
  unknown: {
    label: { en: "Official letter", ja: "公的な通知" },
    office: "The office named as the sender on the letter",
    how: ["Check the deadline and amount yourself on the letter, and ask the sender's office if anything is unclear"],
    links: [],
  },
};
