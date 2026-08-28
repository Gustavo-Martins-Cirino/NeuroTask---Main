import { describe, it, expect } from "vitest"
import { FATOR_REDUZIDO, duracaoDoMovimento } from "./movimento"

describe("duracaoDoMovimento", () => {
  it("sem preferência, ninguém encurta nada", () => {
    expect(duracaoDoMovimento(0.7, "informativo", false)).toBe(0.7)
    expect(duracaoDoMovimento(0.7, "ambiente", false)).toBe(0.7)
    expect(duracaoDoMovimento(0.7, "ambiente", null)).toBe(0.7) // ainda não sabe
  })

  it("o enfeite para; o que mostra um dado continua, mais curto", () => {
    expect(duracaoDoMovimento(0.7, "ambiente", true)).toBe(0)
    expect(duracaoDoMovimento(0.7, "informativo", true)).toBeCloseTo(0.7 * FATOR_REDUZIDO, 6)
  })

  it("o informativo NUNCA vira zero — era o bug: o clique parecia não fazer nada", () => {
    for (const base of [0.2, 0.42, 0.55, 1.2]) {
      expect(duracaoDoMovimento(base, "informativo", true)).toBeGreaterThan(0)
    }
  })

  it("encurtar é encurtar: menor que a base, e não um valor fixo", () => {
    expect(duracaoDoMovimento(0.42, "informativo", true))
      .toBeLessThan(duracaoDoMovimento(0.42, "informativo", false))
    expect(duracaoDoMovimento(1, "informativo", true))
      .toBeGreaterThan(duracaoDoMovimento(0.5, "informativo", true))
  })
})
