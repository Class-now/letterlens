import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(import.meta.dirname, "..", "samples");
const names = readdirSync(dir)
  .filter((f) => f.endsWith(".txt"))
  .map((f) => f.replace(/\.txt$/, ""));

type Quote = { text: string; start: number; end: number };

function quotes(value: unknown): Quote[] {
  if (Array.isArray(value)) return value.flatMap(quotes);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.text === "string" && typeof o.start === "number" && typeof o.end === "number") return [o as Quote];
    return Object.values(o).flatMap(quotes);
  }
  return [];
}

describe("samples", () => {
  it("has the 5 letters", () => expect(names).toHaveLength(5));

  for (const name of names) {
    it(`${name} has png and expected json whose quotes match the text`, () => {
      expect(existsSync(join(dir, `${name}.png`))).toBe(true);
      const text = readFileSync(join(dir, `${name}.txt`), "utf8");
      const expected = JSON.parse(readFileSync(join(dir, "expected", `${name}.json`), "utf8"));
      expect(expected.actions.length).toBeGreaterThan(0);
      for (const q of quotes(expected)) expect(text.slice(q.start, q.end)).toBe(q.text);
      for (const a of expected.actions) {
        if (a.deadline) expect(a.deadline.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  }
});
