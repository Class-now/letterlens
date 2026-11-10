import { describe, expect, it } from "vitest";
import { READINGS, readingOf } from "../src/readings";

describe("readings", () => {
  it("replaces a wrong model reading for a listed term", () => {
    expect(readingOf("督促状", "とくそじょう")).toBe("とくそくじょう");
  });

  it("keeps the model's reading for a term that is not listed", () => {
    expect(readingOf("宇田川町", "うだがわちょう")).toBe("うだがわちょう");
  });

  it("lists readings in hiragana only", () => {
    for (const [term, reading] of Object.entries(READINGS)) {
      expect(reading, term).toMatch(/^[ぁ-んー]+$/);
    }
  });
});
