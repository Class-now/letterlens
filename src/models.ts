// Workers AI model ids, in one place.
export const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
export const TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/** Output languages: code → name used in prompts. */
export const LANGUAGES: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese",
  vi: "Vietnamese",
  ne: "Nepali",
  ko: "Korean",
  pt: "Portuguese",
  es: "Spanish",
  tl: "Filipino (Tagalog)",
  id: "Indonesian",
  "ja-easy": "easy Japanese (やさしい日本語: short sentences, common words, hiragana readings for kanji words)",
};

export function languageOf(code: unknown): string {
  return typeof code === "string" && code in LANGUAGES ? code : "en";
}

/** Upper bound for letter text (UTF-8 bytes) accepted by /api/analyze and returned by /api/read. */
export const MAX_TEXT_BYTES = 8 * 1024;
