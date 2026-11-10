// Workers AI model ids, in one place.
// Vision: measured on the five sample letters (character accuracy of the transcription):
// Llama 4 Scout 97–100%, Mistral Small 3.1 94–99% (one upstream error), Llama 3.2 11B Vision garbled dates.
export const VISION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
export const VISION_FALLBACK_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";
export const TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// Llama 3.3 sometimes answers in English when asked for Nepali or mixes kanji into Korean. A rejected
// answer is rewritten by Mistral Small 3.1, whose model card lists Nepali, Korean, Vietnamese and Chinese.
export const WRITER_FALLBACK_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

/** Output languages: code → name used in prompts. */
export const LANGUAGES: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese (简体中文)",
  vi: "Vietnamese (Tiếng Việt)",
  ne: "Nepali (नेपाली, in Devanagari script)",
  ko: "Korean (한국어)",
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
