// Renders samples/*.txt into A4-like PNG images (as if photographed/scanned) with headless Chromium.
// Run: node scripts/render-samples.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samplesDir = join(root, "samples");

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function page(text) {
  const [title, ...rest] = text.trimEnd().split("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
  body { margin: 0; background: #fff; }
  .sheet { width: 794px; min-height: 1123px; box-sizing: border-box; padding: 64px 72px;
    font-family: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", serif; color: #111;
    font-size: 15px; line-height: 1.75; }
  h1 { font-size: 22px; text-align: center; margin: 0 0 28px; letter-spacing: 0.08em;
    border-bottom: 2px solid #111; padding-bottom: 10px; }
  pre { font: inherit; white-space: pre-wrap; margin: 0; }
  </style></head><body><div class="sheet"><h1>${escape(title)}</h1><pre>${escape(rest.join("\n").trim())}</pre></div></body></html>`;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1.5 });
const tab = await ctx.newPage();
for (const file of readdirSync(samplesDir).filter((f) => f.endsWith(".txt")).sort()) {
  await tab.setContent(page(readFileSync(join(samplesDir, file), "utf8")));
  const out = join(samplesDir, file.replace(/\.txt$/, ".png"));
  await tab.locator(".sheet").screenshot({ path: out });
  console.log(`rendered ${out}`);
}
await browser.close();
