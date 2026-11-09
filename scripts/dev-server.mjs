// Starts / stops the offline dev server for smoke tests and demo recording (Windows and POSIX).
import { spawn, spawnSync } from "node:child_process";

const isWin = process.platform === "win32";

/** Rebuilds the client bundle (public/app.js is gitignored) and starts `wrangler dev` on 127.0.0.1:port. */
export function spawnDevServer(root, port) {
  const build = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit", shell: isWin });
  if (build.status !== 0) throw new Error("npm run build failed");
  const child = spawn("npx", ["wrangler", "dev", "-c", "wrangler.offline.jsonc", "--port", String(port), "--ip", "127.0.0.1"], {
    cwd: root,
    stdio: ["ignore", "ignore", "inherit"],
    detached: !isWin,
    shell: isWin,
  });
  child.on("error", (err) => {
    console.log(`FAIL could not start dev server: ${err.message}`);
    process.exit(1);
  });
  return child;
}

/** Stops the server and every child it started (wrangler → workerd). */
export function stopServer(child) {
  if (!child?.pid) return;
  try {
    if (isWin) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // already gone
  }
}
