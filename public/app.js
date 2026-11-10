// src/doc-types.ts
var HELP_LINKS = [
  { title: "Foreign Residents Support Center (FRESC), Immigration Services Agency", url: "https://www.moj.go.jp/isa/support/fresc/fresc01.html" },
  { title: "Guidebook on Living and Working (multilingual), Immigration Services Agency", url: "https://www.moj.go.jp/isa/support/portal/guidebook_all.html" }
];
var GUIDANCE = {
  resident_tax: {
    label: { en: "Resident tax bill", ja: "\u4F4F\u6C11\u7A0E\u306E\u7D0D\u7A0E\u901A\u77E5\u66F8" },
    office: "The tax division (\u7A0E\u52D9\u8AB2) of the city or ward office that sent the letter",
    how: [
      "Pay with the enclosed payment slip at a bank, Japan Post Bank, convenience store or the city office",
      "Many cities accept smartphone payment apps (scan the slip's barcode) and the eLTAX online payment site",
      "If paying is difficult, talk to the tax division before the deadline"
    ],
    links: [
      { title: "Individual resident tax, Tokyo Metropolitan Government Bureau of Taxation", url: "https://www.tax.metro.tokyo.lg.jp/kazei/kojin_ju.html" },
      { title: "eLTAX local tax online payment", url: "https://www.payment.eltax.lta.go.jp/" }
    ]
  },
  health_insurance: {
    label: { en: "National Health Insurance premium notice", ja: "\u56FD\u6C11\u5065\u5EB7\u4FDD\u967A\u6599\u306E\u7D0D\u5165\u901A\u77E5\u66F8" },
    office: "The National Health Insurance division (\u56FD\u6C11\u5065\u5EB7\u4FDD\u967A\u8AB2) of the city or ward office",
    how: [
      "Pay with the enclosed payment slip at a bank, convenience store or the city office, or set up automatic bank debit",
      "If your income dropped or you lost your job, ask the office about premium reductions"
    ],
    links: [
      { title: "National Health Insurance, Ministry of Health, Labour and Welfare", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/koukikourei/index_00002.html" }
    ]
  },
  pension_student: {
    label: { en: "National Pension student exemption notice", ja: "\u56FD\u6C11\u5E74\u91D1 \u5B66\u751F\u7D0D\u4ED8\u7279\u4F8B\u306E\u3054\u6848\u5185" },
    office: "The pension office (\u5E74\u91D1\u4E8B\u52D9\u6240) or the National Pension counter (\u56FD\u6C11\u5E74\u91D1\u4FC2) at the city office",
    how: [
      "Send the application form with a copy of your student ID or certificate of enrollment by mail, at the city office, or online via Mynaportal"
    ],
    links: [
      { title: "Exemption and postponement of National Pension premiums, Japan Pension Service", url: "https://www.nenkin.go.jp/service/kokunen/menjo/index.html" },
      { title: "Japan Pension Service in other languages", url: "https://www.nenkin.go.jp/international/index.html" }
    ]
  },
  mynumber_renewal: {
    label: { en: "My Number Card certificate expiry notice", ja: "\u30DE\u30A4\u30CA\u30F3\u30D0\u30FC\u30AB\u30FC\u30C9 \u96FB\u5B50\u8A3C\u660E\u66F8\u306E\u6709\u52B9\u671F\u9650\u901A\u77E5" },
    office: "The resident records counter (\u6238\u7C4D\u4F4F\u6C11\u8AB2 / \u5E02\u6C11\u8AB2) of the city or ward office",
    how: [
      "Go to the city office in person with your My Number Card, the notice and your PINs; renewal of the certificates is free"
    ],
    links: [
      { title: "My Number Card portal site (J-LIS)", url: "https://www.kojinbango-card.go.jp/" },
      { title: "My Number system, Digital Agency", url: "https://www.digital.go.jp/policies/mynumber" }
    ]
  },
  reminder: {
    label: { en: "Payment reminder", ja: "\u7763\u4FC3\u72B6" },
    office: "The collection section (\u53CE\u7D0D\u4FC2) named on the letter",
    how: [
      "Pay the unpaid amount by the new deadline with the enclosed slip",
      "If you already paid, keep your receipt; if paying is difficult, call the office before the deadline to ask about instalments"
    ],
    links: [
      { title: "eLTAX local tax online payment", url: "https://www.payment.eltax.lta.go.jp/" }
    ]
  },
  unknown: {
    label: { en: "Official letter", ja: "\u516C\u7684\u306A\u901A\u77E5" },
    office: "The office named as the sender on the letter",
    how: ["Check the deadline and amount yourself on the letter, and ask the sender's office if anything is unclear"],
    links: []
  }
};

// src/ics.ts
var CRLF = "\r\n";
var MAX_OCTETS = 75;
function escapeText(value) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}
function foldLine(line) {
  const enc = new TextEncoder();
  const parts = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
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
function compactDate(date) {
  return date.replace(/-/g, "");
}
function nextDay(date) {
  const d = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function stamp(now) {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
function formatYen(value) {
  return `\xA5${value.toLocaleString("en-US")}`;
}
function describe(action, japaneseTitle) {
  const lines = [];
  if (action.amountYen) lines.push(`${formatYen(action.amountYen.value)} (${action.amountYen.source.text})`);
  if (action.deadline) lines.push(`\u671F\u9650 / Deadline: ${action.deadline.source.text}`);
  for (const step of action.how) lines.push(`- ${step}`);
  lines.push(japaneseTitle);
  lines.push("LetterLens \u2014 not legal advice. Check the original letter.");
  return lines.join("\n");
}
function vevent(action, analysis, now) {
  const deadline = action.deadline;
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
    "END:VEVENT"
  ];
}
function buildIcs(analysis, actions = analysis.actions, now = /* @__PURE__ */ new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LetterLens//Letter deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...actions.filter((a) => a.deadline).flatMap((a) => vevent(a, analysis, now)),
    "END:VCALENDAR"
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}
function icsFilename(action) {
  return action?.deadline ? `letterlens-${action.deadline.date}.ics` : "letterlens-deadlines.ics";
}

// src/models.ts
var LANGUAGES = {
  en: "English",
  zh: "Simplified Chinese (\u7B80\u4F53\u4E2D\u6587)",
  vi: "Vietnamese (Ti\u1EBFng Vi\u1EC7t)",
  ne: "Nepali (\u0928\u0947\u092A\u093E\u0932\u0940, in Devanagari script)",
  ko: "Korean (\uD55C\uAD6D\uC5B4)",
  pt: "Portuguese",
  es: "Spanish",
  tl: "Filipino (Tagalog)",
  id: "Indonesian",
  "ja-easy": "easy Japanese (\u3084\u3055\u3057\u3044\u65E5\u672C\u8A9E: short sentences, common words, hiragana readings for kanji words)"
};
var MAX_TEXT_BYTES = 8 * 1024;

// src/web/format.ts
function uiLangOf(outputLanguage) {
  return outputLanguage === "ja-easy" ? "ja" : "en";
}
var STRINGS = {
  tagline: { en: "Understand letters from Japanese offices", ja: "\u5F79\u6240\u30FB\u5E74\u91D1\u30FB\u7A0E\u306E\u624B\u7D19\u3092\u308F\u304B\u308A\u3084\u3059\u304F" },
  language: { en: "Explain in", ja: "\u8AAC\u660E\u306E\u8A00\u8449" },
  photo: { en: "Take or upload a photo", ja: "\u5199\u771F\u3092\u64AE\u308B\u30FB\u9078\u3076" },
  paste: { en: "Or paste the letter text", ja: "\u307E\u305F\u306F\u624B\u7D19\u306E\u6587\u5B57\u3092\u8CBC\u308A\u4ED8\u3051" },
  analyze: { en: "Explain this letter", ja: "\u3053\u306E\u624B\u7D19\u3092\u8AAC\u660E\u3059\u308B" },
  samples: { en: "Try a sample letter", ja: "\u30B5\u30F3\u30D7\u30EB\u306E\u624B\u7D19\u3067\u8A66\u3059" },
  samplesNote: { en: "Synthetic letters with fictional names, amounts and dates.", ja: "\u67B6\u7A7A\u306E\u540D\u524D\u30FB\u91D1\u984D\u30FB\u65E5\u4ED8\u306E\u898B\u672C\u3067\u3059\u3002" },
  stepRead: { en: "Reading", ja: "\u8AAD\u307F\u53D6\u308A\u4E2D" },
  stepUnderstand: { en: "Understanding", ja: "\u5185\u5BB9\u3092\u7406\u89E3\u4E2D" },
  stepCheck: { en: "Checking facts", ja: "\u65E5\u4ED8\u3068\u91D1\u984D\u3092\u78BA\u8A8D\u4E2D" },
  stepWrite: { en: "Writing in", ja: "\u66F8\u3044\u3066\u3044\u307E\u3059:" },
  done: { en: "Done", ja: "\u5B8C\u4E86" },
  whatIs: { en: "What this is", ja: "\u3053\u308C\u306F\u4F55\u306E\u624B\u7D19?" },
  todo: { en: "What you must do", ja: "\u3084\u308B\u3053\u3068" },
  ifIgnore: { en: "What happens if you ignore it", ja: "\u653E\u3063\u3066\u304A\u304F\u3068\u3069\u3046\u306A\u308B?" },
  terms: { en: "Key terms", ja: "\u5927\u4E8B\u306A\u3053\u3068\u3070" },
  ask: { en: "Ask a follow-up", ja: "\u8CEA\u554F\u3059\u308B" },
  askPlaceholder: { en: "e.g. Can I pay at a convenience store?", ja: "\u4F8B: \u30B3\u30F3\u30D3\u30CB\u3067\u6255\u3048\u307E\u3059\u304B?" },
  askSend: { en: "Ask", ja: "\u8CEA\u554F" },
  askLeft: { en: "questions left", ja: "\u56DE\u307E\u3067\u8CEA\u554F\u3067\u304D\u307E\u3059" },
  askNone: { en: "No questions left for this letter.", ja: "\u3053\u306E\u624B\u7D19\u3078\u306E\u8CEA\u554F\u306F\u3053\u3053\u307E\u3067\u3067\u3059\u3002" },
  letterText: { en: "Letter text", ja: "\u624B\u7D19\u306E\u6587\u5B57" },
  trace: { en: "AI trace", ja: "AI \u306E\u51E6\u7406\u8A18\u9332" },
  addCal: { en: "Add to calendar", ja: "\u30AB\u30EC\u30F3\u30C0\u30FC\u306B\u8FFD\u52A0" },
  addAllCal: { en: "Add all deadlines to calendar", ja: "\u3059\u3079\u3066\u306E\u671F\u9650\u3092\u30AB\u30EC\u30F3\u30C0\u30FC\u306B\u8FFD\u52A0" },
  deadline: { en: "Deadline", ja: "\u671F\u9650" },
  amount: { en: "Amount", ja: "\u91D1\u984D" },
  how: { en: "How", ja: "\u65B9\u6CD5" },
  checkYourself: { en: "Check this yourself", ja: "\u81EA\u5206\u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044" },
  noDeadline: { en: "No deadline found in the letter", ja: "\u624B\u7D19\u306B\u671F\u9650\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" },
  showQuote: { en: "Show in letter", ja: "\u624B\u7D19\u3067\u898B\u308B" },
  noConsequences: { en: "The letter does not say.", ja: "\u624B\u7D19\u306B\u306F\u66F8\u304B\u308C\u3066\u3044\u307E\u305B\u3093\u3002" },
  disclaimer: {
    en: "LetterLens is an AI helper, not legal or tax advice. Always check the original letter, and ask the office that sent it if anything is unclear.",
    ja: "LetterLens \u306F AI \u306E\u624B\u4F1D\u3044\u3067\u3059\u3002\u6CD5\u5F8B\u30FB\u7A0E\u306E\u76F8\u8AC7\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u5FC5\u305A\u5143\u306E\u624B\u7D19\u3092\u78BA\u8A8D\u3057\u3001\u308F\u304B\u3089\u306A\u3044\u3053\u3068\u306F\u9001\u3063\u3066\u304D\u305F\u5F79\u6240\u306B\u805E\u3044\u3066\u304F\u3060\u3055\u3044\u3002"
  },
  help: { en: "Official help in your language", ja: "\u591A\u8A00\u8A9E\u306E\u516C\u5F0F\u76F8\u8AC7\u7A93\u53E3" },
  startOver: { en: "Explain another letter", ja: "\u5225\u306E\u624B\u7D19\u3092\u8AAC\u660E\u3059\u308B" },
  offline: { en: "Offline mode: deterministic result without AI (English).", ja: "\u30AA\u30D5\u30E9\u30A4\u30F3: AI \u3092\u4F7F\u308F\u306A\u3044\u78BA\u5B9A\u7684\u306A\u7D50\u679C(\u82F1\u8A9E)\u3067\u3059\u3002" },
  fallbackNote: { en: "fallback (no AI)", ja: "\u30D5\u30A9\u30FC\u30EB\u30D0\u30C3\u30AF(AI \u306A\u3057)" },
  error: { en: "Something went wrong", ja: "\u30A8\u30E9\u30FC\u304C\u8D77\u304D\u307E\u3057\u305F" },
  photoUnavailable: {
    en: "Reading photos needs the online AI, which is not available here. Please paste the text instead.",
    ja: "\u5199\u771F\u306E\u8AAD\u307F\u53D6\u308A\u306B\u306F\u30AA\u30F3\u30E9\u30A4\u30F3\u306E AI \u304C\u5FC5\u8981\u3067\u3059\u3002\u6587\u5B57\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002"
  },
  tooLong: { en: "The text is too long (max 8 KB).", ja: "\u6587\u5B57\u304C\u9577\u3059\u304E\u307E\u3059(\u6700\u5927 8 KB)\u3002" },
  tooBig: { en: "The image is too large (max 5 MB).", ja: "\u753B\u50CF\u304C\u5927\u304D\u3059\u304E\u307E\u3059(\u6700\u5927 5 MB)\u3002" },
  rateLimited: { en: "Too many requests. Please wait a minute.", ja: "\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u591A\u3059\u304E\u307E\u3059\u30021 \u5206\u5F85\u3063\u3066\u304F\u3060\u3055\u3044\u3002" },
  emptyText: { en: "Please paste the letter text first.", ja: "\u5148\u306B\u624B\u7D19\u306E\u6587\u5B57\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002" },
  privacy: { en: "Privacy", ja: "\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC" },
  step: { en: "Step", ja: "\u624B\u9806" },
  model: { en: "Model", ja: "\u30E2\u30C7\u30EB" },
  dropped: { en: "Dropped", ja: "\u9664\u5916" }
};
function t(key, lang) {
  return STRINGS[key][lang];
}
function daysUntil(isoDate, today) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - base) / 864e5);
}
function countdown(isoDate, today, lang) {
  const n = daysUntil(isoDate, today);
  if (lang === "ja") {
    if (n === 0) return { text: "\u4ECA\u65E5\u307E\u3067", overdue: false };
    if (n > 0) return { text: `\u3042\u3068 ${n} \u65E5`, overdue: false };
    return { text: `${-n} \u65E5\u904E\u304E\u3066\u3044\u307E\u3059`, overdue: true };
  }
  if (n === 0) return { text: "due today", overdue: false };
  if (n === 1) return { text: "in 1 day", overdue: false };
  if (n > 0) return { text: `in ${n} days`, overdue: false };
  if (n === -1) return { text: "1 day overdue", overdue: true };
  return { text: `${-n} days overdue`, overdue: true };
}
function yen(value) {
  return `\xA5${value.toLocaleString("en-US")}`;
}
function splitAtQuote(text, quote) {
  let { start, end } = quote;
  if (text.slice(start, end) !== quote.text) {
    start = text.indexOf(quote.text);
    if (start < 0 || !quote.text) return void 0;
    end = start + quote.text.length;
  }
  return [text.slice(0, start), text.slice(start, end), text.slice(end)];
}
function errorMessage(code, lang) {
  switch (code) {
    case "ocr_unavailable":
    case "ocr_failed":
      return t("photoUnavailable", lang);
    case "text_too_long":
    case "body_too_large":
      return t("tooLong", lang);
    case "image_too_large":
      return t("tooBig", lang);
    case "rate_limited":
      return t("rateLimited", lang);
    case "text_required":
      return t("emptyText", lang);
    default:
      return `${t("error", lang)}${code ? ` (${code})` : ""}`;
  }
}
var MAX_FOLLOW_UPS = 3;

// samples/a-resident-tax.txt
var a_resident_tax_default = "\u4EE4\u548C8\u5E74\u5EA6 \u7279\u5225\u533A\u6C11\u7A0E\u30FB\u90FD\u6C11\u7A0E \u7D0D\u7A0E\u901A\u77E5\u66F8\uFF08\u666E\u901A\u5FB4\u53CE\uFF09\n\n\u901A\u77E5\u66F8\u756A\u53F7 2026-0451-7782\n\u767A\u884C\u65E5 \u4EE4\u548C8\u5E746\u670810\u65E5\n\n\u3012150-0041\n\u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u795E\u53579\u4E01\u76EE99\u756A9\u53F7 \u30B5\u30F3\u30D7\u30EB\u30CF\u30A4\u30C4203\nLEE MINH ANH \u69D8\n\n\u6E0B\u8C37\u533A\u9577\n\u6E0B\u8C37\u533A \u533A\u6C11\u90E8 \u7A0E\u52D9\u8AB2\n\u3012150-8010 \u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u5B87\u7530\u5DDD\u753A1\u756A1\u53F7\n\u96FB\u8A71 03-0000-0000\uFF08\u7A0E\u52D9\u8AB2 \u666E\u901A\u5FB4\u53CE\u4FC2\uFF09\n\n\u4EE4\u548C8\u5E74\u5EA6\u306E\u7279\u5225\u533A\u6C11\u7A0E\u30FB\u90FD\u6C11\u7A0E\u306E\u7A0E\u984D\u3092\u6B21\u306E\u3068\u304A\u308A\u6C7A\u5B9A\u3057\u307E\u3057\u305F\u306E\u3067\u901A\u77E5\u3057\u307E\u3059\u3002\n\u3053\u306E\u7A0E\u984D\u306F\u3001\u4EE4\u548C7\u5E741\u67081\u65E5\u304B\u308912\u670831\u65E5\u307E\u3067\u306E\u6240\u5F97\u3092\u3082\u3068\u306B\u8A08\u7B97\u3057\u3066\u3044\u307E\u3059\u3002\n\n\u5E74\u7A0E\u984D 98,400\u5186\n\uFF08\u5185\u8A33\uFF09\u7279\u5225\u533A\u6C11\u7A0E 59,000\u5186\u3000\u90FD\u6C11\u7A0E 39,400\u5186\n\n\u5404\u671F\u306E\u7D0D\u671F\u9650\u3068\u7D0D\u4ED8\u984D\n\u671F\u5225\u3000\u7D0D\u671F\u9650\u3000\u7D0D\u4ED8\u984D\n\u7B2C1\u671F\u3000\u4EE4\u548C8\u5E746\u670830\u65E5\u300024,900\u5186\n\u7B2C2\u671F\u3000\u4EE4\u548C8\u5E748\u670831\u65E5\u300024,500\u5186\n\u7B2C3\u671F\u3000\u4EE4\u548C8\u5E7411\u67082\u65E5\u300024,500\u5186\n\u7B2C4\u671F\u3000\u4EE4\u548C9\u5E742\u67081\u65E5\u300024,500\u5186\n\n\u4E00\u62EC\u3067\u7D0D\u4ED8\u3059\u308B\u5834\u5408\u306F\u3001\u7B2C1\u671F\u306E\u7D0D\u671F\u9650\uFF08\u4EE4\u548C8\u5E746\u670830\u65E5\uFF09\u307E\u3067\u306B\u5E74\u7A0E\u984D\u3092\u7D0D\u3081\u3066\u304F\u3060\u3055\u3044\u3002\n\n\u7D0D\u4ED8\u5834\u6240\n\u540C\u5C01\u306E\u7D0D\u4ED8\u66F8\u3067\u3001\u91D1\u878D\u6A5F\u95A2\uFF08\u9280\u884C\u30FB\u4FE1\u7528\u91D1\u5EAB\u30FB\u3086\u3046\u3061\u3087\u9280\u884C\uFF09\u3001\u30B3\u30F3\u30D3\u30CB\u30A8\u30F3\u30B9\u30B9\u30C8\u30A2\u3001\u533A\u5F79\u6240\u7A0E\u52D9\u8AB2\u7A93\u53E3\u3067\u7D0D\u4ED8\u3067\u304D\u307E\u3059\u3002\n\u30B9\u30DE\u30FC\u30C8\u30D5\u30A9\u30F3\u6C7A\u6E08\u30A2\u30D7\u30EA\uFF08\u7D0D\u4ED8\u66F8\u306E\u30D0\u30FC\u30B3\u30FC\u30C9\u8AAD\u307F\u53D6\u308A\uFF09\u3001\u5730\u65B9\u7A0E\u304A\u652F\u6255\u30B5\u30A4\u30C8\uFF08https://www.payment.eltax.lta.go.jp/\uFF09\u3067\u3082\u7D0D\u4ED8\u3067\u304D\u307E\u3059\u3002\n\u53E3\u5EA7\u632F\u66FF\u3092\u3054\u5E0C\u671B\u306E\u65B9\u306F\u3001\u7A0E\u52D9\u8AB2\u3078\u304A\u7533\u3057\u8FBC\u307F\u304F\u3060\u3055\u3044\u3002\n\n\u3054\u6CE8\u610F\n\u7D0D\u671F\u9650\u307E\u3067\u306B\u7D0D\u4ED8\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u7763\u4FC3\u72B6\u3092\u9001\u4ED8\u3057\u307E\u3059\u3002\u307E\u305F\u3001\u7D0D\u671F\u9650\u306E\u7FCC\u65E5\u304B\u3089\u7D0D\u4ED8\u306E\u65E5\u307E\u3067\u306E\u65E5\u6570\u306B\u5FDC\u3058\u3066\u5EF6\u6EDE\u91D1\u304C\u304B\u304B\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\n\u3053\u306E\u51E6\u5206\u306B\u4E0D\u670D\u304C\u3042\u308B\u5834\u5408\u306F\u3001\u3053\u306E\u901A\u77E5\u3092\u53D7\u3051\u53D6\u3063\u305F\u65E5\u306E\u7FCC\u65E5\u304B\u3089\u8D77\u7B97\u3057\u30663\u304B\u6708\u4EE5\u5185\u306B\u3001\u6E0B\u8C37\u533A\u9577\u306B\u5BFE\u3057\u3066\u5BE9\u67FB\u8ACB\u6C42\u3092\u3059\u308B\u3053\u3068\u304C\u3067\u304D\u307E\u3059\u3002\n";

// samples/b-health-insurance.txt
var b_health_insurance_default = "\u4EE4\u548C8\u5E74\u5EA6 \u56FD\u6C11\u5065\u5EB7\u4FDD\u967A\u6599 \u7D0D\u5165\u901A\u77E5\u66F8\n\n\u767A\u884C\u65E5 \u4EE4\u548C8\u5E746\u670812\u65E5\n\n\u3012150-0042\n\u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u5B87\u7530\u5DDD\u753A99\u756A9\u53F7 \u30C6\u30B9\u30C8\u30B3\u30FC\u30C8501\nNGUYEN VAN BINH \u69D8\n\n\u6E0B\u8C37\u533A \u533A\u6C11\u90E8 \u56FD\u6C11\u5065\u5EB7\u4FDD\u967A\u8AB2 \u4FDD\u967A\u6599\u4FC2\n\u3012150-8010 \u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u5B87\u7530\u5DDD\u753A1\u756A1\u53F7\n\u96FB\u8A71 03-0000-0001\n\n\u3042\u306A\u305F\u306E\u4E16\u5E2F\u306E\u4EE4\u548C8\u5E74\u5EA6\u56FD\u6C11\u5065\u5EB7\u4FDD\u967A\u6599\u3092\u6B21\u306E\u3068\u304A\u308A\u6C7A\u5B9A\u3057\u307E\u3057\u305F\u306E\u3067\u901A\u77E5\u3057\u307E\u3059\u3002\n\u4FDD\u967A\u6599\u306F\u3001\u4E16\u5E2F\u4E3B\u306E\u65B9\u306B\u7D0D\u3081\u3066\u3044\u305F\u3060\u304D\u307E\u3059\u3002\n\n\u88AB\u4FDD\u967A\u8005\u6570 1\u4EBA\n\u5E74\u9593\u4FDD\u967A\u6599\u984D 87,000\u5186\n\uFF08\u5185\u8A33\uFF09\u57FA\u790E\u5206 61,200\u5186\u3000\u5F8C\u671F\u9AD8\u9F62\u8005\u652F\u63F4\u91D1\u5206 25,800\u5186\n\n\u7D0D\u671F\u9650\u3068\u5404\u671F\u306E\u4FDD\u967A\u6599\u984D\uFF08\u4EE4\u548C8\u5E74\u5EA6\uFF09\n\u7B2C1\u671F\u30006\u670830\u65E5(\u706B)\u30008,700\u5186\n\u7B2C2\u671F\u30007\u670831\u65E5(\u91D1)\u30008,700\u5186\n\u7B2C3\u671F\u30008\u670831\u65E5(\u6708)\u30008,700\u5186\n\u7B2C4\u671F\u30009\u670830\u65E5(\u6C34)\u30008,700\u5186\n\u7B2C5\u671F\u300011\u67082\u65E5(\u6708)\u30008,700\u5186\n\u7B2C6\u671F\u300011\u670830\u65E5(\u6708)\u30008,700\u5186\n\u7B2C7\u671F\u300012\u670828\u65E5(\u6708)\u30008,700\u5186\n\u7B2C8\u671F\u30002\u67081\u65E5(\u6708)\u30008,700\u5186\n\u7B2C9\u671F\u30003\u67081\u65E5(\u6708)\u30008,700\u5186\n\u7B2C10\u671F\u30003\u670831\u65E5(\u6C34)\u30008,700\u5186\n\n\u7D0D\u4ED8\u65B9\u6CD5\n\u540C\u5C01\u306E\u7D0D\u4ED8\u66F8\u3067\u3001\u91D1\u878D\u6A5F\u95A2\u3001\u30B3\u30F3\u30D3\u30CB\u30A8\u30F3\u30B9\u30B9\u30C8\u30A2\u3001\u533A\u5F79\u6240\u306E\u7A93\u53E3\u3067\u7D0D\u3081\u3066\u304F\u3060\u3055\u3044\u3002\n\u30B9\u30DE\u30FC\u30C8\u30D5\u30A9\u30F3\u6C7A\u6E08\u30A2\u30D7\u30EA\u3067\u3082\u7D0D\u4ED8\u3067\u304D\u307E\u3059\u3002\u53E3\u5EA7\u632F\u66FF\u306E\u624B\u7D9A\u304D\u3082\u3067\u304D\u307E\u3059\u3002\n\n\u3054\u6CE8\u610F\n\u4FDD\u967A\u6599\u3092\u6EDE\u7D0D\u3059\u308B\u3068\u3001\u901A\u5E38\u306E\u4FDD\u967A\u8A3C\uFF08\u8CC7\u683C\u78BA\u8A8D\u66F8\uFF09\u3088\u308A\u6709\u52B9\u671F\u9593\u306E\u77ED\u3044\u3082\u306E\u306B\u306A\u3063\u305F\u308A\u3001\u533B\u7642\u8CBB\u3092\u3044\u3063\u305F\u3093\u5168\u984D\u81EA\u5DF1\u8CA0\u62C5\u3057\u3066\u3044\u305F\u3060\u304F\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\n\u6240\u5F97\u304C\u4E00\u5B9A\u4EE5\u4E0B\u306E\u4E16\u5E2F\u306F\u3001\u4FDD\u967A\u6599\u304C\u8EFD\u6E1B\u3055\u308C\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\u524D\u5E74\u306E\u6240\u5F97\u306E\u7533\u544A\u304C\u306A\u3044\u65B9\u306F\u3001\u7533\u544A\u3092\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u707D\u5BB3\u3084\u5931\u696D\u306A\u3069\u3067\u7D0D\u4ED8\u304C\u96E3\u3057\u3044\u5834\u5408\u306F\u3001\u7D0D\u671F\u9650\u307E\u3067\u306B\u56FD\u6C11\u5065\u5EB7\u4FDD\u967A\u8AB2\u306B\u3054\u76F8\u8AC7\u304F\u3060\u3055\u3044\u3002\n";

// samples/c-pension-student.txt
var c_pension_student_default = "\u56FD\u6C11\u5E74\u91D1\u4FDD\u967A\u6599 \u5B66\u751F\u7D0D\u4ED8\u7279\u4F8B\u5236\u5EA6 \u7533\u8ACB\u306E\u3054\u6848\u5185\n\n\u4EE4\u548C8\u5E744\u670810\u65E5\n\n\u3012150-0001\n\u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u795E\u5BAE\u524D9\u4E01\u76EE99\u756A9\u53F7 \u30B5\u30F3\u30D7\u30EB\u30EC\u30B8\u30C7\u30F3\u30B9102\nSHRESTHA SITA \u69D8\n\n\u65E5\u672C\u5E74\u91D1\u6A5F\u69CB \u6E0B\u8C37\u5E74\u91D1\u4E8B\u52D9\u6240\n\u3012150-8334 \u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u795E\u53571\u4E01\u76EE0\u756A0\u53F7\n\u96FB\u8A71 03-0000-0002\n\n\u57FA\u790E\u5E74\u91D1\u756A\u53F7 0000-000000\n\n\u3042\u306A\u305F\u306F\u56FD\u6C11\u5E74\u91D1\u306E\u7B2C1\u53F7\u88AB\u4FDD\u967A\u8005\u3067\u3059\u3002\u65E5\u672C\u306B\u4F4F\u308020\u6B73\u4EE5\u4E0A60\u6B73\u672A\u6E80\u306E\u65B9\u306F\u3001\u56FD\u7C4D\u306B\u95A2\u4FC2\u306A\u304F\u56FD\u6C11\u5E74\u91D1\u306B\u52A0\u5165\u3057\u3001\u4FDD\u967A\u6599\u3092\u7D0D\u3081\u308B\u3053\u3068\u306B\u306A\u3063\u3066\u3044\u307E\u3059\u3002\n\u4EE4\u548C8\u5E74\u5EA6\u306E\u56FD\u6C11\u5E74\u91D1\u4FDD\u967A\u6599\u306F\u6708\u984D17,920\u5186\u3067\u3059\u3002\n\n\u5B66\u751F\u306E\u65B9\u3067\u3001\u672C\u4EBA\u306E\u524D\u5E74\u6240\u5F97\u304C\u4E00\u5B9A\u4EE5\u4E0B\u306E\u5834\u5408\u306F\u3001\u7533\u8ACB\u306B\u3088\u308A\u5728\u5B66\u4E2D\u306E\u4FDD\u967A\u6599\u306E\u7D0D\u4ED8\u304C\u7336\u4E88\u3055\u308C\u308B\u300C\u5B66\u751F\u7D0D\u4ED8\u7279\u4F8B\u5236\u5EA6\u300D\u3092\u5229\u7528\u3067\u304D\u307E\u3059\u3002\n\n\u5BFE\u8C61\u671F\u9593\u3000\u4EE4\u548C8\u5E744\u6708\u304B\u3089\u4EE4\u548C9\u5E743\u6708\u307E\u3067\n\u63D0\u51FA\u671F\u9650\u3000\u4EE4\u548C8\u5E745\u670829\u65E5\uFF08\u91D1\uFF09\n\n\u7533\u8ACB\u65B9\u6CD5\n\u540C\u5C01\u306E\u300C\u56FD\u6C11\u5E74\u91D1\u4FDD\u967A\u6599\u5B66\u751F\u7D0D\u4ED8\u7279\u4F8B\u7533\u8ACB\u66F8\u300D\u306B\u8A18\u5165\u3057\u3001\u5B66\u751F\u8A3C\u306E\u5199\u3057\uFF08\u4E21\u9762\uFF09\u307E\u305F\u306F\u5728\u5B66\u8A3C\u660E\u66F8\u3092\u6DFB\u3048\u3066\u3001\u6B21\u306E\u3044\u305A\u308C\u304B\u3067\u63D0\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n1. \u8FD4\u4FE1\u7528\u5C01\u7B52\u3067\u6E0B\u8C37\u5E74\u91D1\u4E8B\u52D9\u6240\u3078\u90F5\u9001\n2. \u6E0B\u8C37\u533A\u5F79\u6240 \u56FD\u6C11\u5E74\u91D1\u4FC2\u306E\u7A93\u53E3\u3078\u6301\u53C2\n3. \u30DE\u30A4\u30CA\u30DD\u30FC\u30BF\u30EB\u304B\u3089\u96FB\u5B50\u7533\u8ACB\n\n\u3054\u6CE8\u610F\n\u7533\u8ACB\u3092\u305B\u305A\u306B\u4FDD\u967A\u6599\u3092\u7D0D\u3081\u306A\u3044\u5834\u5408\u306F\u672A\u7D0D\u3068\u306A\u308A\u3001\u969C\u5BB3\u3084\u6B7B\u4EA1\u3068\u3044\u3063\u305F\u4E0D\u6E2C\u306E\u4E8B\u614B\u304C\u751F\u3058\u305F\u969B\u306B\u3001\u969C\u5BB3\u57FA\u790E\u5E74\u91D1\u30FB\u907A\u65CF\u57FA\u790E\u5E74\u91D1\u3092\u53D7\u3051\u53D6\u308B\u3053\u3068\u304C\u3067\u304D\u306A\u3044\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\n\u672A\u7D0D\u304C\u7D9A\u304F\u3068\u7763\u4FC3\u3092\u884C\u3044\u3001\u5EF6\u6EDE\u91D1\u304C\u304B\u304B\u308B\u5834\u5408\u3084\u3001\u8CA1\u7523\u306E\u5DEE\u62BC\u3048\u3092\u884C\u3046\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\n\u5B66\u751F\u7D0D\u4ED8\u7279\u4F8B\u306E\u627F\u8A8D\u3092\u53D7\u3051\u305F\u671F\u9593\u306F\u300110\u5E74\u4EE5\u5185\u3067\u3042\u308C\u3070\u4FDD\u967A\u6599\u3092\u5F8C\u304B\u3089\u7D0D\u3081\u308B\uFF08\u8FFD\u7D0D\u3059\u308B\uFF09\u3053\u3068\u304C\u3067\u304D\u307E\u3059\u3002\n";

// samples/d-mynumber-renewal.txt
var d_mynumber_renewal_default = "\u6709\u52B9\u671F\u9650\u901A\u77E5\u66F8\n\u30DE\u30A4\u30CA\u30F3\u30D0\u30FC\u30AB\u30FC\u30C9\uFF08\u500B\u4EBA\u756A\u53F7\u30AB\u30FC\u30C9\uFF09\u306E\u96FB\u5B50\u8A3C\u660E\u66F8\u306E\u6709\u52B9\u671F\u9650\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059\n\n\u4EE4\u548C8\u5E7410\u670820\u65E5\n\n\u3012150-0043\n\u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u9053\u7384\u57429\u4E01\u76EE99\u756A9\u53F7 \u30C6\u30B9\u30C8\u30CF\u30A6\u30B9305\nKIM JIWOO \u69D8\n\n\u6E0B\u8C37\u533A \u6238\u7C4D\u4F4F\u6C11\u8AB2 \u30DE\u30A4\u30CA\u30F3\u30D0\u30FC\u30AB\u30FC\u30C9\u62C5\u5F53\n\u3012150-8010 \u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u5B87\u7530\u5DDD\u753A1\u756A1\u53F7\n\u96FB\u8A71 03-0000-0003\n\n\u5730\u65B9\u516C\u5171\u56E3\u4F53\u60C5\u5831\u30B7\u30B9\u30C6\u30E0\u6A5F\u69CB\uFF08J-LIS\uFF09\n\n\u3042\u306A\u305F\u306E\u30DE\u30A4\u30CA\u30F3\u30D0\u30FC\u30AB\u30FC\u30C9\u306B\u642D\u8F09\u3055\u308C\u3066\u3044\u308B\u7F72\u540D\u7528\u96FB\u5B50\u8A3C\u660E\u66F8\u53CA\u3073\u5229\u7528\u8005\u8A3C\u660E\u7528\u96FB\u5B50\u8A3C\u660E\u66F8\u306E\u6709\u52B9\u671F\u9650\u306F\u3001\u6B21\u306E\u3068\u304A\u308A\u3067\u3059\u3002\n\n\u96FB\u5B50\u8A3C\u660E\u66F8\u306E\u6709\u52B9\u671F\u9650\u3000\u4EE4\u548C9\u5E741\u670815\u65E5\n\n\u6709\u52B9\u671F\u9650\u304C\u904E\u304E\u308B\u3068\u3001\u30DE\u30A4\u30CA\u30F3\u30D0\u30FC\u30AB\u30FC\u30C9\u3092\u5065\u5EB7\u4FDD\u967A\u8A3C\u3068\u3057\u3066\u5229\u7528\u3059\u308B\u3053\u3068\u3084\u3001\u30B3\u30F3\u30D3\u30CB\u30A8\u30F3\u30B9\u30B9\u30C8\u30A2\u3067\u306E\u8A3C\u660E\u66F8\u306E\u4EA4\u4ED8\u3001\u30DE\u30A4\u30CA\u30DD\u30FC\u30BF\u30EB\u3078\u306E\u30ED\u30B0\u30A4\u30F3\u3001e-Tax\u306A\u3069\u306E\u96FB\u5B50\u7533\u8ACB\u304C\u3067\u304D\u306A\u304F\u306A\u308A\u307E\u3059\u3002\n\n\u66F4\u65B0\u306E\u624B\u7D9A\u304D\n\u6709\u52B9\u671F\u9650\u306E3\u304B\u6708\u524D\u304B\u3089\u66F4\u65B0\u306E\u624B\u7D9A\u304D\u304C\u3067\u304D\u307E\u3059\u3002\u624B\u6570\u6599\u306F\u7121\u6599\u3067\u3059\u3002\n\u304A\u624B\u6570\u3067\u3059\u304C\u3001\u6709\u52B9\u671F\u9650\u307E\u3067\u306B\u3001\u6B21\u306E\u3082\u306E\u3092\u304A\u6301\u3061\u306E\u3046\u3048\u3001\u3054\u672C\u4EBA\u304C\u6E0B\u8C37\u533A\u5F79\u6240 \u6238\u7C4D\u4F4F\u6C11\u8AB2\u306E\u7A93\u53E3\u3078\u304A\u8D8A\u3057\u304F\u3060\u3055\u3044\u3002\n\u30FB\u30DE\u30A4\u30CA\u30F3\u30D0\u30FC\u30AB\u30FC\u30C9\n\u30FB\u3053\u306E\u901A\u77E5\u66F8\n\u30FB\u30AB\u30FC\u30C9\u306E\u6697\u8A3C\u756A\u53F7\uFF084\u6841\u306E\u6570\u5B57\u3068\u30016\uFF5E16\u6841\u306E\u82F1\u6570\u5B57\uFF09\n\n\u53D7\u4ED8\u6642\u9593\u3000\u5E73\u65E5 \u5348\u524D8\u664230\u5206\u304B\u3089\u5348\u5F8C5\u6642\u307E\u3067\n\n\u5728\u7559\u30AB\u30FC\u30C9\u3092\u304A\u6301\u3061\u306E\u65B9\u3078\n\u30DE\u30A4\u30CA\u30F3\u30D0\u30FC\u30AB\u30FC\u30C9\u672C\u4F53\u306E\u6709\u52B9\u671F\u9650\u306F\u5728\u7559\u671F\u9593\u306E\u6E80\u4E86\u65E5\u3068\u540C\u3058\u3067\u3059\u3002\u5728\u7559\u671F\u9593\u3092\u66F4\u65B0\u3057\u305F\u5834\u5408\u306F\u300114\u65E5\u4EE5\u5185\u306B\u30AB\u30FC\u30C9\u306E\u6709\u52B9\u671F\u9593\u306E\u5909\u66F4\u624B\u7D9A\u304D\u3092\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n";

// samples/e-tax-reminder.txt
var e_tax_reminder_default = "\u7763\u4FC3\u72B6\n\n\u4EE4\u548C8\u5E749\u670810\u65E5\n\n\u3012150-0041\n\u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u795E\u53579\u4E01\u76EE99\u756A9\u53F7 \u30B5\u30F3\u30D7\u30EB\u30CF\u30A4\u30C4203\nLEE MINH ANH \u69D8\n\n\u6E0B\u8C37\u533A\u9577\n\u6E0B\u8C37\u533A \u533A\u6C11\u90E8 \u7A0E\u52D9\u8AB2 \u53CE\u7D0D\u4FC2\n\u3012150-8010 \u6771\u4EAC\u90FD\u6E0B\u8C37\u533A\u5B87\u7530\u5DDD\u753A1\u756A1\u53F7\n\u96FB\u8A71 03-0000-0004\n\n\u3042\u306A\u305F\u306E\u4EE4\u548C8\u5E74\u5EA6\u7279\u5225\u533A\u6C11\u7A0E\u30FB\u90FD\u6C11\u7A0E\uFF08\u666E\u901A\u5FB4\u53CE\uFF09\u306E\u3046\u3061\u3001\u4E0B\u8A18\u306E\u7A0E\u91D1\u304C\u7D0D\u671F\u9650\u3092\u904E\u304E\u3066\u3082\u7D0D\u4ED8\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\n\u6307\u5B9A\u671F\u9650\u307E\u3067\u306B\u5FC5\u305A\u7D0D\u4ED8\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\n\u7A0E\u76EE\u3000\u7279\u5225\u533A\u6C11\u7A0E\u30FB\u90FD\u6C11\u7A0E\n\u5E74\u5EA6\u30FB\u671F\u5225\u3000\u4EE4\u548C\uFF18\u5E74\u5EA6 \u7B2C\uFF12\u671F\n\u7D0D\u671F\u9650\u3000\u4EE4\u548C\uFF18\u5E74\uFF18\u6708\uFF13\uFF11\u65E5\n\u672A\u7D0D\u7A0E\u984D\u3000\uFF12\uFF14\uFF0C\uFF15\uFF10\uFF10\u5186\n\u7763\u4FC3\u624B\u6570\u6599\u3000\uFF10\u5186\n\n\u6307\u5B9A\u671F\u9650\u3000\u4EE4\u548C\uFF18\u5E74\uFF19\u6708\uFF12\uFF15\u65E5\n\n\u3059\u3067\u306B\u7D0D\u4ED8\u3055\u308C\u305F\u65B9\u306F\u3001\u884C\u304D\u9055\u3044\u3067\u3059\u306E\u3067\u3054\u5BB9\u8D66\u304F\u3060\u3055\u3044\u3002\n\n\u5EF6\u6EDE\u91D1\u306B\u3064\u3044\u3066\n\u7D0D\u671F\u9650\u306E\u7FCC\u65E5\u304B\u3089\u7D0D\u4ED8\u306E\u65E5\u307E\u3067\u306E\u671F\u9593\u306B\u5FDC\u3058\u3066\u3001\u5EF6\u6EDE\u91D1\u304C\u304B\u304B\u308A\u307E\u3059\u3002\u5EF6\u6EDE\u91D1\u306E\u5272\u5408\u306F\u3001\u7D0D\u671F\u9650\u306E\u7FCC\u65E5\u304B\u30891\u304B\u6708\u3092\u7D4C\u904E\u3059\u308B\u65E5\u307E\u3067\u306F\u5E742.4%\u3001\u305D\u306E\u7FCC\u65E5\u4EE5\u964D\u306F\u5E748.7%\u3067\u3059\u3002\u5EF6\u6EDE\u91D1\u306F\u5F8C\u65E5\u304A\u77E5\u3089\u305B\u3057\u307E\u3059\u3002\n\n\u3054\u6CE8\u610F\n\u6307\u5B9A\u671F\u9650\u307E\u3067\u306B\u7D0D\u4ED8\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u5730\u65B9\u7A0E\u6CD5\u306E\u898F\u5B9A\u306B\u3088\u308A\u3001\u8CA1\u7523\uFF08\u7D66\u4E0E\u30FB\u9810\u8CAF\u91D1\u306A\u3069\uFF09\u306E\u5DEE\u62BC\u3048\u306A\u3069\u306E\u6EDE\u7D0D\u51E6\u5206\u3092\u884C\u3046\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002\n\u7D0D\u4ED8\u304C\u96E3\u3057\u3044\u4E8B\u60C5\u304C\u3042\u308B\u5834\u5408\u306F\u3001\u6307\u5B9A\u671F\u9650\u307E\u3067\u306B\u53CE\u7D0D\u4FC2\u3078\u3054\u76F8\u8AC7\u304F\u3060\u3055\u3044\u3002\u5206\u5272\u3067\u306E\u7D0D\u4ED8\u306B\u3064\u3044\u3066\u76F8\u8AC7\u3067\u304D\u307E\u3059\u3002\n\n\u7D0D\u4ED8\u5834\u6240\n\u540C\u5C01\u306E\u7D0D\u4ED8\u66F8\u3067\u3001\u91D1\u878D\u6A5F\u95A2\u3001\u30B3\u30F3\u30D3\u30CB\u30A8\u30F3\u30B9\u30B9\u30C8\u30A2\u3001\u533A\u5F79\u6240\u7A0E\u52D9\u8AB2\u7A93\u53E3\u3067\u7D0D\u4ED8\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n";

// src/web/samples.ts
var SAMPLES = [
  { id: "a-resident-tax", docType: "resident_tax", text: a_resident_tax_default },
  { id: "b-health-insurance", docType: "health_insurance", text: b_health_insurance_default },
  { id: "c-pension-student", docType: "pension_student", text: c_pension_student_default },
  { id: "d-mynumber-renewal", docType: "mynumber_renewal", text: d_mynumber_renewal_default },
  { id: "e-tax-reminder", docType: "reminder", text: e_tax_reminder_default }
];

// src/web/app.ts
var LANG_KEY = "letterlens.language";
var LANG_LABELS = {
  en: "English",
  zh: "\u7B80\u4F53\u4E2D\u6587",
  vi: "Ti\u1EBFng Vi\u1EC7t",
  ne: "\u0928\u0947\u092A\u093E\u0932\u0940",
  ko: "\uD55C\uAD6D\uC5B4",
  pt: "Portugu\xEAs",
  es: "Espa\xF1ol",
  tl: "Filipino",
  id: "Bahasa Indonesia",
  "ja-easy": "\u3084\u3055\u3057\u3044\u65E5\u672C\u8A9E"
};
var $ = (id) => document.getElementById(id);
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c !== void 0) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}
var state = {
  language: "en",
  text: "",
  result: void 0,
  asked: 0
};
var ui = () => uiLangOf(state.language);
var tr = (key) => t(key, ui());
function loadLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && saved in LANGUAGES) return saved;
  } catch {
  }
  return "en";
}
function applyChrome() {
  document.documentElement.lang = ui();
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = tr(node.dataset.i18n);
  }
  $("question").placeholder = tr("askPlaceholder");
  renderSamples();
}
function setupLanguage() {
  const select = $("language");
  for (const code of Object.keys(LANGUAGES)) select.appendChild(el("option", { value: code }, LANG_LABELS[code] ?? code));
  state.language = loadLanguage();
  select.value = state.language;
  select.addEventListener("change", () => {
    state.language = select.value;
    try {
      localStorage.setItem(LANG_KEY, state.language);
    } catch {
    }
    applyChrome();
    if (state.result) renderResult(state.result);
  });
}
function renderSamples() {
  const list = $("samples");
  list.replaceChildren(
    ...SAMPLES.map((s) => {
      const label = GUIDANCE[s.docType].label;
      const button = el(
        "button",
        { type: "button", class: "sample", "data-sample": s.id },
        el("span", { class: "sample-title" }, ui() === "ja" ? label.ja : label.en),
        el("span", { class: "sample-ja", lang: "ja" }, s.text.split("\n")[0])
      );
      button.addEventListener("click", () => {
        $("text").value = s.text;
        void run({ text: s.text });
      });
      return el("li", {}, button);
    })
  );
}
function stepLabel(id) {
  if (id === "read") return tr("stepRead");
  if (id === "understand") return tr("stepUnderstand");
  if (id === "check") return tr("stepCheck");
  return `${tr("stepWrite")} ${LANG_LABELS[state.language] ?? state.language}`;
}
function showSteps(ids, active) {
  $("progress").hidden = false;
  $("steps").replaceChildren(
    ...ids.map((id, i) => {
      const status = i < active ? "done" : i === active ? "active" : "todo";
      const li = el("li", { class: status }, `${stepLabel(id)}${status === "active" ? "\u2026" : ""}`);
      if (status === "active") li.setAttribute("aria-current", "step");
      return li;
    })
  );
}
function showError(message) {
  const box = $("error");
  box.hidden = !message;
  box.textContent = message ?? "";
}
async function post(path, body, json = true) {
  const res = await fetch(path, {
    method: "POST",
    body,
    headers: json ? { "content-type": "application/json" } : void 0
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `http_${res.status}`);
  return data;
}
var busy = false;
async function run(input) {
  if (busy) return;
  busy = true;
  showError(void 0);
  $("result").hidden = true;
  const ids = input.image ? ["read", "understand", "check", "write"] : ["understand", "check", "write"];
  let active = 0;
  showSteps(ids, active);
  const timers = [];
  try {
    let text = input.text ?? "";
    let readSteps = [];
    if (input.image) {
      const form = new FormData();
      form.append("image", input.image);
      const read = await post("/api/read", form, false);
      text = String(read.text ?? "");
      readSteps = read.trace?.steps ?? [];
      $("text").value = text;
      active = 1;
      showSteps(ids, active);
    }
    if (!text.trim()) throw new Error("text_required");
    const base = active;
    timers.push(window.setTimeout(() => showSteps(ids, base + 1), 900));
    timers.push(window.setTimeout(() => showSteps(ids, base + 2), 2200));
    const result = await post("/api/analyze", JSON.stringify({ text, language: state.language }));
    if (readSteps.length && result.trace) result.trace.steps = [...readSteps, ...result.trace.steps];
    timers.forEach(clearTimeout);
    showSteps(ids, ids.length);
    $("steps").appendChild(el("li", { class: "done" }, tr("done")));
    state.text = text;
    state.result = result;
    state.asked = 0;
    $("chat").replaceChildren();
    renderResult(result);
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    timers.forEach(clearTimeout);
    $("progress").hidden = true;
    showError(errorMessage(err instanceof Error ? err.message : void 0, ui()));
  } finally {
    busy = false;
  }
}
function setupInput() {
  $("analyze").addEventListener("click", () => {
    const text = $("text").value;
    if (!text.trim()) return showError(tr("emptyText"));
    void run({ text });
  });
  $("photo").addEventListener("change", (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showError(tr("tooBig"));
    void run({ image: file });
  });
  $("again").addEventListener("click", () => {
    $("result").hidden = true;
    $("progress").hidden = true;
    $("text").value = "";
    $("input").scrollIntoView({ behavior: "smooth" });
    $("text").focus();
  });
}
function renderLetter(highlight) {
  const pre = $("letter");
  const parts = highlight ? splitAtQuote(state.text, highlight) : void 0;
  if (!parts) {
    pre.replaceChildren(state.text);
    return;
  }
  const mark = el("mark", { id: "hl" }, parts[1]);
  pre.replaceChildren(parts[0], mark, parts[2]);
  mark.scrollIntoView({ behavior: "smooth", block: "center" });
}
function quoteButton(label, quote) {
  const button = el(
    "button",
    { type: "button", class: "quote", title: tr("showQuote"), "aria-label": `${label} \u2014 ${tr("showQuote")}: ${quote.text}` },
    label
  );
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    for (const b of document.querySelectorAll(".quote[aria-expanded=true]")) b.setAttribute("aria-expanded", "false");
    for (const q of document.querySelectorAll(".quote-text")) q.remove();
    if (expanded) return renderLetter();
    button.setAttribute("aria-expanded", "true");
    button.insertAdjacentElement("afterend", el("span", { class: "quote-text", lang: "ja" }, `\u300C${quote.text}\u300D`));
    renderLetter(quote);
  });
  return button;
}
function checkChip() {
  return el("span", { class: "chip warn" }, `\u26A0 ${tr("checkYourself")}`);
}
function download(name, content) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const a = el("a", { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function renderAction(action, index, result) {
  const id = `act-${index}`;
  const rows = [];
  const low = action.confidence === "low";
  if (action.deadline) {
    const c = countdown(action.deadline.date, /* @__PURE__ */ new Date(), ui());
    rows.push(
      el(
        "p",
        { class: "fact" },
        el("span", { class: "fact-label" }, `${tr("deadline")}: `),
        quoteButton(action.deadline.date, action.deadline.source),
        " ",
        el("span", { class: c.overdue ? "chip overdue" : "chip" }, c.text)
      )
    );
  } else {
    rows.push(el("p", { class: "fact muted" }, tr("noDeadline")));
  }
  if (action.amountYen) {
    rows.push(
      el(
        "p",
        { class: "fact" },
        el("span", { class: "fact-label" }, `${tr("amount")}: `),
        quoteButton(yen(action.amountYen.value), action.amountYen.source)
      )
    );
  }
  if (action.how.length) {
    rows.push(el("p", { class: "fact-label" }, `${tr("how")}:`), el("ul", { class: "how" }, ...action.how.map((h) => el("li", {}, h))));
  }
  const li = el(
    "li",
    { class: low ? "action low" : "action" },
    el("div", { class: "action-head" }, el("input", { type: "checkbox", id }), el("label", { for: id }, action.title), low ? checkChip() : void 0),
    ...rows
  );
  if (action.deadline) {
    const cal = el("button", { type: "button", class: "button small no-print" }, `\u{1F4C5} ${tr("addCal")}`);
    cal.addEventListener("click", () => download(icsFilename(action), buildIcs(result, [action])));
    li.appendChild(cal);
  }
  return li;
}
function renderResult(result) {
  const guidance = GUIDANCE[result.docType] ?? GUIDANCE.unknown;
  $("offline").hidden = !result.trace?.fallback;
  $("badge").textContent = `${ui() === "ja" ? guidance.label.ja : guidance.label.en} \xB7 ${guidance.label.ja}`;
  $("sender").textContent = result.sender;
  $("summary").textContent = result.summary;
  $("warnings").replaceChildren(...result.warnings.map((w) => el("li", {}, checkChip(), " ", w)));
  $("actions").replaceChildren(...result.actions.map((a, i) => renderAction(a, i, result)));
  $("cal-all").hidden = result.actions.filter((a) => a.deadline).length < 2;
  $("consequences").replaceChildren(
    ...result.consequences.length ? result.consequences.map((c) => el("li", {}, c.text, " ", c.source ? quoteButton("\u539F\u6587", c.source) : void 0)) : [el("li", { class: "muted" }, tr("noConsequences"))]
  );
  $("glossary").replaceChildren(
    ...result.glossary.flatMap((g) => [
      el("dt", { lang: "ja" }, g.reading ? el("ruby", {}, g.term, el("rp", {}, "("), el("rt", {}, g.reading), el("rp", {}, ")")) : g.term),
      el("dd", {}, g.meaning)
    ])
  );
  const links = [...guidance.links, ...HELP_LINKS];
  $("help").replaceChildren(
    ...links.map((l) => el("li", {}, el("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" }, l.title)))
  );
  $("trace").replaceChildren(
    ...(result.trace?.steps ?? []).map(
      (s) => el(
        "tr",
        {},
        el("td", {}, s.step, s.note ? el("div", { class: "muted small" }, s.note) : void 0),
        el("td", { class: "mono" }, s.model ?? (s.step === "fallback" ? tr("fallbackNote") : "rules")),
        el("td", { class: "num" }, String(s.ms)),
        el("td", {}, s.dropped?.length ? s.dropped.join("; ") : "\u2014")
      )
    )
  );
  renderLetter();
  updateAskLeft();
}
function updateAskLeft() {
  const left = MAX_FOLLOW_UPS - state.asked;
  $("ask-left").textContent = left > 0 ? ui() === "ja" ? `\u3042\u3068 ${left} ${tr("askLeft")}` : `${left} ${tr("askLeft")}` : tr("askNone");
  const form = $("ask-form");
  for (const c of form.querySelectorAll("input, button")) c.disabled = left <= 0;
}
function setupAsk() {
  $("ask-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("question");
    const question = input.value.trim();
    if (!question || !state.result || state.asked >= MAX_FOLLOW_UPS) return;
    state.asked++;
    input.value = "";
    updateAskLeft();
    const chat = $("chat");
    chat.appendChild(el("p", { class: "msg me" }, question));
    const pending = el("p", { class: "msg ai" }, "\u2026");
    chat.appendChild(pending);
    try {
      const data = await post(
        "/api/ask",
        JSON.stringify({ text: state.text, analysisSummary: state.result.summary, question, language: state.language })
      );
      pending.textContent = String(data.answer ?? "");
    } catch (err) {
      pending.textContent = errorMessage(err instanceof Error ? err.message : void 0, ui());
    }
  });
}
setupLanguage();
setupInput();
setupAsk();
applyChrome();
$("cal-all").addEventListener("click", () => {
  if (state.result) download(icsFilename(), buildIcs(state.result));
});
