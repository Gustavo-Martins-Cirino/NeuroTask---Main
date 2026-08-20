import { describe, expect, it } from "vitest"
import { fadeDaBorda, mascaraCss } from "./mascara-rolagem"

const area = { scrollHeight: 1000, clientHeight: 400 }

describe("fadeDaBorda", () => {
  it("no topo, só a base esmaece", () => {
    expect(fadeDaBorda({ ...area, scrollTop: 0 }, 40)).toEqual({ topo: 0, base: 40 })
  })

  it("no fim, só o topo esmaece", () => {
    expect(fadeDaBorda({ ...area, scrollTop: 600 }, 40)).toEqual({ topo: 40, base: 0 })
  })

  it("no meio, as duas bordas esmaecem no máximo", () => {
    expect(fadeDaBorda({ ...area, scrollTop: 300 }, 40)).toEqual({ topo: 40, base: 40 })
  })

  it("cresce de 0 até fade conforme sai da ponta", () => {
    expect(fadeDaBorda({ ...area, scrollTop: 10 }, 40)).toEqual({ topo: 10, base: 40 })
    expect(fadeDaBorda({ ...area, scrollTop: 590 }, 40)).toEqual({ topo: 40, base: 10 })
  })

  it("sem overflow, nada esmaece", () => {
    expect(fadeDaBorda({ scrollHeight: 400, clientHeight: 400, scrollTop: 0 }, 40)).toEqual({
      topo: 0,
      base: 0,
    })
  })

  it("nunca devolve valor negativo (scrollTop além do fim, ou fade negativo)", () => {
    expect(fadeDaBorda({ ...area, scrollTop: 9999 }, 40)).toEqual({ topo: 40, base: 0 })
    expect(fadeDaBorda({ ...area, scrollTop: 300 }, -5)).toEqual({ topo: 0, base: 0 })
  })
})

describe("mascaraCss", () => {
  it("sem desvanecer devolve none", () => {
    expect(mascaraCss(0, 0)).toBe("none")
  })

  it("monta o gradiente com as duas bordas", () => {
    expect(mascaraCss(40, 24)).toBe(
      "linear-gradient(to bottom, transparent 0, #000 40px, #000 calc(100% - 24px), transparent 100%)"
    )
  })

  it("basta uma borda para haver máscara", () => {
    expect(mascaraCss(40, 0)).toContain("#000 40px")
    expect(mascaraCss(0, 40)).toContain("calc(100% - 40px)")
  })
})
