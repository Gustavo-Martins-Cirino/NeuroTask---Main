import { describe, it, expect } from "vitest"
import { snapshotFilename } from "./office-snapshot"

describe("snapshotFilename", () => {
  it("usa a data local no formato YYYY-MM-DD (mês/dia com zero à esquerda)", () => {
    expect(snapshotFilename(new Date(2026, 0, 5))).toBe("neurotask-escritorio-2026-01-05.png")
    expect(snapshotFilename(new Date(2026, 11, 25))).toBe("neurotask-escritorio-2026-12-25.png")
  })
})
