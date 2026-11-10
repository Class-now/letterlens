// Turns demo-out/raw.webm into demo-out/demo.mp4: the stretches where the page waits for the live
// model (marks.json "waits") are sped up so the video stays near 2 minutes. Needs ffmpeg on PATH.
// Run: node scripts/edit-demo.mjs [outDir] [speed]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(process.argv[2] ?? join(root, "demo-out"));
const speed = Number(process.argv[3] ?? 6);
const marks = JSON.parse(readFileSync(join(outDir, "marks.json"), "utf8"));

// Keep the first 1.5 s of each wait at normal speed so the progress list is readable.
const fast = (marks.waits ?? []).map(([a, b]) => [a + 1.5, b - 0.3]).filter(([a, b]) => b - a > 2);

const parts = [];
let at = 0;
for (const [a, b] of fast) {
  parts.push({ from: at, to: a, speed: 1 });
  parts.push({ from: a, to: b, speed });
  at = b;
}
parts.push({ from: at, to: null, speed: 1 });

const chains = parts.map((p, i) => {
  const trim = p.to === null ? `trim=start=${p.from}` : `trim=start=${p.from}:end=${p.to}`;
  return `[0:v]${trim},setpts=(PTS-STARTPTS)/${p.speed}[v${i}]`;
});
const filter = `${chains.join(";")};${parts.map((_, i) => `[v${i}]`).join("")}concat=n=${parts.length}:v=1:a=0,fps=30[out]`;

const out = join(outDir, "demo.mp4");
const res = spawnSync(
  "ffmpeg",
  ["-y", "-i", join(outDir, "raw.webm"), "-filter_complex", filter, "-map", "[out]", "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
  { stdio: ["ignore", "inherit", "inherit"] },
);
if (res.status !== 0) process.exit(res.status ?? 1);
const saved = fast.reduce((s, [a, b]) => s + (b - a) * (1 - 1 / speed), 0);
console.log(`\nwrote ${out} (${fast.length} waits sped up ×${speed}, about ${(marks.durationSec - saved).toFixed(0)} s)`);
