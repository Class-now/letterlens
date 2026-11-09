// Pure helpers for the web UI (no DOM), so they can be unit tested in Node.
import type { Quote } from "../types";

export type UiLang = "en" | "ja";

/** UI chrome follows the output language: easy Japanese gets Japanese chrome, everything else English. */
export function uiLangOf(outputLanguage: string): UiLang {
  return outputLanguage === "ja-easy" ? "ja" : "en";
}

const STRINGS = {
  tagline: { en: "Understand letters from Japanese offices", ja: "役所・年金・税の手紙をわかりやすく" },
  language: { en: "Explain in", ja: "説明の言葉" },
  photo: { en: "Take or upload a photo", ja: "写真を撮る・選ぶ" },
  paste: { en: "Or paste the letter text", ja: "または手紙の文字を貼り付け" },
  analyze: { en: "Explain this letter", ja: "この手紙を説明する" },
  samples: { en: "Try a sample letter", ja: "サンプルの手紙で試す" },
  samplesNote: { en: "Synthetic letters with fictional names, amounts and dates.", ja: "架空の名前・金額・日付の見本です。" },
  stepRead: { en: "Reading", ja: "読み取り中" },
  stepUnderstand: { en: "Understanding", ja: "内容を理解中" },
  stepCheck: { en: "Checking facts", ja: "日付と金額を確認中" },
  stepWrite: { en: "Writing in", ja: "書いています:" },
  done: { en: "Done", ja: "完了" },
  whatIs: { en: "What this is", ja: "これは何の手紙?" },
  todo: { en: "What you must do", ja: "やること" },
  ifIgnore: { en: "What happens if you ignore it", ja: "放っておくとどうなる?" },
  terms: { en: "Key terms", ja: "大事なことば" },
  ask: { en: "Ask a follow-up", ja: "質問する" },
  askPlaceholder: { en: "e.g. Can I pay at a convenience store?", ja: "例: コンビニで払えますか?" },
  askSend: { en: "Ask", ja: "質問" },
  askLeft: { en: "questions left", ja: "回まで質問できます" },
  askNone: { en: "No questions left for this letter.", ja: "この手紙への質問はここまでです。" },
  letterText: { en: "Letter text", ja: "手紙の文字" },
  trace: { en: "AI trace", ja: "AI の処理記録" },
  addCal: { en: "Add to calendar", ja: "カレンダーに追加" },
  addAllCal: { en: "Add all deadlines to calendar", ja: "すべての期限をカレンダーに追加" },
  deadline: { en: "Deadline", ja: "期限" },
  amount: { en: "Amount", ja: "金額" },
  how: { en: "How", ja: "方法" },
  checkYourself: { en: "Check this yourself", ja: "自分で確認してください" },
  noDeadline: { en: "No deadline found in the letter", ja: "手紙に期限が見つかりません" },
  showQuote: { en: "Show in letter", ja: "手紙で見る" },
  noConsequences: { en: "The letter does not say.", ja: "手紙には書かれていません。" },
  disclaimer: {
    en: "LetterLens is an AI helper, not legal or tax advice. Always check the original letter, and ask the office that sent it if anything is unclear.",
    ja: "LetterLens は AI の手伝いです。法律・税の相談ではありません。必ず元の手紙を確認し、わからないことは送ってきた役所に聞いてください。",
  },
  help: { en: "Official help in your language", ja: "多言語の公式相談窓口" },
  startOver: { en: "Explain another letter", ja: "別の手紙を説明する" },
  offline: { en: "Offline mode: deterministic result without AI (English).", ja: "オフライン: AI を使わない確定的な結果(英語)です。" },
  fallbackNote: { en: "fallback (no AI)", ja: "フォールバック(AI なし)" },
  error: { en: "Something went wrong", ja: "エラーが起きました" },
  photoUnavailable: {
    en: "Reading photos needs the online AI, which is not available here. Please paste the text instead.",
    ja: "写真の読み取りにはオンラインの AI が必要です。文字を貼り付けてください。",
  },
  tooLong: { en: "The text is too long (max 8 KB).", ja: "文字が長すぎます(最大 8 KB)。" },
  tooBig: { en: "The image is too large (max 5 MB).", ja: "画像が大きすぎます(最大 5 MB)。" },
  rateLimited: { en: "Too many requests. Please wait a minute.", ja: "リクエストが多すぎます。1 分待ってください。" },
  emptyText: { en: "Please paste the letter text first.", ja: "先に手紙の文字を貼り付けてください。" },
  privacy: { en: "Privacy", ja: "プライバシー" },
  step: { en: "Step", ja: "手順" },
  model: { en: "Model", ja: "モデル" },
  dropped: { en: "Dropped", ja: "除外" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: UiLang): string {
  return STRINGS[key][lang];
}

/** Whole days from `today` to the ISO date (both taken as calendar dates). */
export function daysUntil(isoDate: string, today: Date): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - base) / 86_400_000);
}

export function countdown(isoDate: string, today: Date, lang: UiLang): { text: string; overdue: boolean } {
  const n = daysUntil(isoDate, today);
  if (lang === "ja") {
    if (n === 0) return { text: "今日まで", overdue: false };
    if (n > 0) return { text: `あと ${n} 日`, overdue: false };
    return { text: `${-n} 日過ぎています`, overdue: true };
  }
  if (n === 0) return { text: "due today", overdue: false };
  if (n === 1) return { text: "in 1 day", overdue: false };
  if (n > 0) return { text: `in ${n} days`, overdue: false };
  if (n === -1) return { text: "1 day overdue", overdue: true };
  return { text: `${-n} days overdue`, overdue: true };
}

export function yen(value: number): string {
  return `¥${value.toLocaleString("en-US")}`;
}

/**
 * Split the letter text into [before, highlighted, after] for a quote. Returns undefined when the
 * quote does not match the text at its offsets (then the UI falls back to searching the text).
 */
export function splitAtQuote(text: string, quote: Quote): [string, string, string] | undefined {
  let { start, end } = quote;
  if (text.slice(start, end) !== quote.text) {
    start = text.indexOf(quote.text);
    if (start < 0 || !quote.text) return undefined;
    end = start + quote.text.length;
  }
  return [text.slice(0, start), text.slice(start, end), text.slice(end)];
}

/** Human message for an API error code. */
export function errorMessage(code: string | undefined, lang: UiLang): string {
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

export const MAX_FOLLOW_UPS = 3;
