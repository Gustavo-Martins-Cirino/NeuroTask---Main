import { describe, it, expect } from "vitest"
import { faseDaHora, PALETA_CIDADE, type FaseDoDia } from "./office-city"

const FASES: FaseDoDia[] = ["dawn", "day", "dusk", "night"]
const brilho = ([r, g, b]: [number, number, number]) => (r + g + b) / 3

describe("faseDaHora", () => {
  it("cobre as 24 horas sem buraco", () => {
    for (let h = 0; h < 24; h++) expect(FASES).toContain(faseDaHora(h))
  })

  it("as viradas caem onde a luz muda de verdade", () => {
    expect(faseDaHora(4)).toBe("night")
    expect(faseDaHora(5)).toBe("dawn")
    expect(faseDaHora(7)).toBe("dawn")
    expect(faseDaHora(8)).toBe("day")
    expect(faseDaHora(16)).toBe("day")
    expect(faseDaHora(17)).toBe("dusk")
    expect(faseDaHora(18)).toBe("dusk")
    expect(faseDaHora(19)).toBe("night")
    expect(faseDaHora(23)).toBe("night")
    expect(faseDaHora(0)).toBe("night")
  })
})

describe("paleta da cidade", () => {
  it("em toda hora a fileira de trás é mais clara que a da frente", () => {
    // Perspectiva atmosférica: é ela que dá profundidade à vista. Sem essa
    // diferença a cidade vira um recorte de papel só.
    for (const f of FASES) {
      const p = PALETA_CIDADE[f]
      expect(brilho(p.predioTras)).toBeGreaterThan(brilho(p.predioFrente))
    }
  })

  it("de dia a cidade é clara; de noite, silhueta", () => {
    expect(brilho(PALETA_CIDADE.day.predioFrente)).toBeGreaterThan(brilho(PALETA_CIDADE.night.predioFrente) * 3)
    expect(brilho(PALETA_CIDADE.day.ceu)).toBeGreaterThan(brilho(PALETA_CIDADE.night.ceu) * 3)
  })

  it("de dia as janelas ficam apagadas — cidade acesa ao meio-dia entrega a cena", () => {
    expect(PALETA_CIDADE.day.janelaBrilho).toBe(0)
    expect(brilho(PALETA_CIDADE.day.janela)).toBeLessThan(brilho(PALETA_CIDADE.day.predioFrente))
    for (const f of ["dusk", "night"] as const) {
      expect(PALETA_CIDADE[f].janelaBrilho).toBeGreaterThan(1)
    }
  })

  it("de noite a janela acesa é o que mais contrasta com o céu", () => {
    const p = PALETA_CIDADE.night
    expect(brilho(p.janela) * p.janelaBrilho).toBeGreaterThan(brilho(p.ceu) * 4)
  })

  it("nenhuma emissão passa da faixa do tone mapping (o erro que branqueou o RGB)", () => {
    for (const f of FASES) {
      const p = PALETA_CIDADE[f]
      expect(Math.max(...p.janela) * p.janelaBrilho).toBeLessThan(1.5)
      expect(Math.max(...p.ceu) * (1 + p.ceuBrilho)).toBeLessThan(1.5)
    }
  })
})
