// Headless Playwright recording (1280×720) of the demo walkthrough in docs/submission/video-script.md.
// Each scene shows a caption in a fixed bottom bar; scene start times go to marks.json so narration
// and edits can be lined up afterwards.
// Run: node scripts/record-demo.mjs [baseUrl] [outDir]
//   baseUrl defaults to a local offline server started by this script (wrangler.offline.jsonc).
//   outDir defaults to demo-out/. Output: <outDir>/raw.webm and <outDir>/marks.json.
//   DEMO_PACE=1 halves the holds for a quick check.
import { spawnDevServer, stopServer } from "./dev-server.mjs";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8799;
const SIZE = { width: 1280, height: 720 };

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("SKIP: playwright is not installed (npm i -D playwright && npx playwright install chromium)");
  process.exit(0);
}

async function waitFor(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not start: ${url}`);
}

/** Waits until nothing answers on url (a previous run's server can take a few seconds to exit). */
async function waitGone(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      await fetch(url);
    } catch {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`port still in use: ${url}`);
}

let base = process.argv[2];
const outDir = resolve(process.argv[3] ?? join(root, "demo-out"));
let server;
if (!base) {
  base = `http://127.0.0.1:${PORT}`;
  await waitGone(`${base}/api/health`, 20_000);
  server = spawnDevServer(root, PORT);
}
base = base.replace(/\/$/, "");

const marks = [];
let t0 = 0;
let page;

/** Starts a scene: shows its caption and records when it began. */
async function scene(id, caption) {
  const t = Number(((Date.now() - t0) / 1000).toFixed(2));
  marks.push({ scene: id, t, caption });
  console.log(`${String(t).padStart(6)}s  ${id}`);
  await page.evaluate((text) => {
    let bar = document.getElementById("demo-caption");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "demo-caption";
      bar.style.cssText =
        "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:14px 24px;" +
        "background:rgba(10,10,20,.82);color:#fff;font:600 22px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none";
      document.body.appendChild(bar);
    }
    bar.textContent = text;
  }, caption);
}

// DEMO_PACE stretches the holds so narration fits (default 2 ≈ 2 minutes; 1 for a quick check).
const PACE = Number(process.env.DEMO_PACE ?? 2);
const pause = (ms) => page.waitForTimeout(ms * PACE);

// Waiting for the live model takes 10–40 s. The start and end of each wait go to marks.json so
// scripts/edit-demo.mjs can speed those stretches up.
const waits = [];
const now = () => Number(((Date.now() - t0) / 1000).toFixed(2));
async function waitResult() {
  const from = now();
  await page.waitForSelector("#result:not([hidden]) .action", { timeout: 120_000 });
  waits.push([from, now()]);
}

/** Smoothly scrolls an element to the top of the viewport. */
async function show(selector, block = "start") {
  await page.locator(selector).first().evaluate((el, b) => el.scrollIntoView({ behavior: "smooth", block: b }), block);
  await page.waitForTimeout(900);
}

let browser;
let context;
let failed = false;
try {
  await waitFor(`${base}/api/health`, 60_000);
  mkdirSync(outDir, { recursive: true });
  const tmpVideos = join(outDir, ".video-tmp");
  rmSync(tmpVideos, { recursive: true, force: true });

  browser = await chromium.launch();
  context = await browser.newContext({
    viewport: SIZE,
    colorScheme: "light",
    acceptDownloads: true,
    recordVideo: { dir: tmpVideos, size: SIZE },
  });
  await context.addInitScript(() => localStorage.setItem("letterlens.language", "en"));
  page = await context.newPage();
  t0 = Date.now();

  await page.goto(base);
  await page.waitForSelector(".sample");
  await scene("01-problem", "Foreign residents in Japan get tax, pension and insurance letters in dense official Japanese.");
  await pause(4000);
  await scene("02-inputs", "LetterLens: take a photo, paste the text, or try one of five synthetic sample letters.");
  await show("#samples", "center");
  await pause(3500);

  await scene("03-analyze", "Resident tax bill → read, classify, extract, check facts, explain — in 10 languages.");
  await page.locator('[data-sample="a-resident-tax"]').click();
  await waitResult();
  await pause(1500);
  await show("#result");
  await pause(2500);

  await scene("04-summary", "What this is: one plain sentence — who sent it and why.");
  await show("#what-h");
  await pause(3500);

  await scene("05-checklist", "What you must do: every instalment with its deadline, amount and where to pay.");
  await show("#todo-h");
  await pause(4000);

  await scene("06-quote", "Every date and amount links to the exact Japanese words it came from.");
  await page.locator("#actions .action").first().locator(".quote").first().click();
  await pause(1500);
  await page.evaluate(() => document.querySelector("#letter mark")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  await pause(3500);

  await scene("07-calendar", "One tap adds the deadline to your calendar, with a reminder 3 days before.");
  await show("#todo-h");
  await Promise.all([
    page.waitForEvent("download"),
    page.locator("#actions .action").first().getByRole("button", { name: /calendar/i }).click(),
  ]);
  await pause(3000);

  await scene("08-terms", "Key terms with readings, so you can talk to the counter staff.");
  await show("#terms-h");
  await pause(4000);

  await scene("09-ask", "Ask a follow-up. Answers come only from the letter — otherwise it says so.");
  await show("#ask-h");
  await page.locator("#question").pressSequentially("Can I pay at a convenience store?", { delay: 35 });
  await page.click("#ask-form button");
  const askFrom = now();
  await page.waitForFunction(() => document.querySelector("#chat .msg.ai")?.textContent !== "…", undefined, { timeout: 60_000 });
  waits.push([askFrom, now()]);
  await pause(4000);

  await scene("10-trace", "The AI trace shows each step, the model used, and any fact the checker dropped.");
  await page.locator("details.trace summary").click();
  await show("details.trace");
  await pause(4500);

  await scene("11-reminder", "A reminder notice: late fees are explained only because the letter says so.");
  await page.click("#again");
  await page.waitForSelector("#input:not([hidden]) .sample");
  await show("#samples", "center");
  await page.locator('[data-sample="e-tax-reminder"]').click();
  await waitResult();
  await pause(1200);
  await show("#ignore-h");
  await pause(4000);

  // A photo goes through the vision model first; shown in Vietnamese to demonstrate another language.
  await scene("11b-photo", "A photo of a health insurance notice, explained in Vietnamese. The vision model reads the Japanese first.");
  await page.click("#again");
  await page.waitForSelector("#input:not([hidden]) .sample");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.selectOption("#language", "vi");
  await pause(1500);
  await page.setInputFiles("#photo", join(root, "samples", "b-health-insurance.png"));
  await waitResult();
  await pause(1000);
  await show("#result");
  await pause(3000);
  await show("#todo-h");
  await pause(3500);

  await scene("12-trust", "Not legal advice. Official help links. Nothing stored — letters are processed and discarded.");
  await show(".disclaimer", "center");
  await pause(4500);

  await scene("13-end", "LetterLens — understand letters from Japanese offices. Built with Llama on Cloudflare Workers AI.");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(4000);

  const video = page.video();
  await context.close();
  context = undefined;
  const raw = join(outDir, "raw.webm");
  rmSync(raw, { force: true });
  renameSync(await video.path(), raw);
  rmSync(tmpVideos, { recursive: true, force: true });
  writeFileSync(
    join(outDir, "marks.json"),
    JSON.stringify({ base, size: SIZE, durationSec: Number(((Date.now() - t0) / 1000).toFixed(2)), waits, scenes: marks }, null, 2) + "\n",
  );
  console.log(`\nrecorded ${raw} (${marks.length} scenes) and marks.json`);
} catch (err) {
  failed = true;
  console.log(`FAIL ${err}`);
} finally {
  await context?.close();
  await browser?.close();
  if (server) {
    try {
      stopServer(server);
      await waitGone(`${base}/api/health`, 20_000);
    } catch {
      // already gone
    }
  }
}
process.exit(failed ? 1 : 0);
